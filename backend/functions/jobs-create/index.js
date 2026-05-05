const { Client } = require('pg');
const AWS = require('aws-sdk');

const cognito = new AWS.CognitoIdentityServiceProvider({ region: process.env.COGNITO_REGION });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json',
};

function response(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function extractToken(event) {
  const auth = event.headers?.Authorization || event.headers?.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function getUserId(db, cognitoSub) {
  const result = await db.query('SELECT id FROM users WHERE cognito_sub = $1', [cognitoSub]);
  return result.rows[0]?.id || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});

  const db = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const accessToken = extractToken(event);
    if (!accessToken) return response(401, { error: 'Authorization token required' });

    const cognitoUser = await cognito.getUser({ AccessToken: accessToken }).promise();
    const cognitoSub = cognitoUser.UserAttributes.find(a => a.Name === 'sub')?.Value;

    const body = JSON.parse(event.body || '{}');
    const { company, jobTitle, startDate, endDate, baseSalary, bonus = 0, location, currency = 'EUR' } = body;

    if (!company || !jobTitle || !startDate || !baseSalary || !location) {
      return response(400, { error: 'company, jobTitle, startDate, baseSalary, and location are required' });
    }

    if (Number(baseSalary) <= 0) {
      return response(400, { error: 'baseSalary must be greater than 0' });
    }

    if (endDate && new Date(endDate) <= new Date(startDate)) {
      return response(400, { error: 'endDate must be after startDate' });
    }

    await db.connect();

    const userId = await getUserId(db, cognitoSub);
    if (!userId) return response(404, { error: 'User not found' });

    const result = await db.query(
      `INSERT INTO jobs (user_id, company, job_title, start_date, end_date, base_salary, bonus, location, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [userId, company, jobTitle, startDate, endDate || null, baseSalary, bonus, location, currency]
    );

    return response(201, { jobId: result.rows[0].id, created: true });
  } catch (err) {
    console.error('Create job error:', err);
    if (err.code === 'NotAuthorizedException') return response(401, { error: 'Invalid or expired token' });
    return response(500, { error: 'Internal server error' });
  } finally {
    await db.end().catch(() => {});
  }
};

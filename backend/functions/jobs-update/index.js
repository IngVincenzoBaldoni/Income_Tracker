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

    const jobId = event.pathParameters?.jobId;
    if (!jobId) return response(400, { error: 'jobId is required' });

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

    const userResult = await db.query('SELECT id FROM users WHERE cognito_sub = $1', [cognitoSub]);
    if (userResult.rows.length === 0) return response(404, { error: 'User not found' });

    const userId = userResult.rows[0].id;

    const result = await db.query(
      `UPDATE jobs
       SET company = $1, job_title = $2, start_date = $3, end_date = $4,
           base_salary = $5, bonus = $6, location = $7, currency = $8
       WHERE id = $9 AND user_id = $10
       RETURNING id`,
      [company, jobTitle, startDate, endDate || null, baseSalary, bonus, location, currency, jobId, userId]
    );

    if (result.rows.length === 0) {
      return response(404, { error: 'Job not found or not authorized' });
    }

    return response(200, { updated: true, jobId: result.rows[0].id });
  } catch (err) {
    console.error('Update job error:', err);
    if (err.code === 'NotAuthorizedException') return response(401, { error: 'Invalid or expired token' });
    return response(500, { error: 'Internal server error' });
  } finally {
    await db.end().catch(() => {});
  }
};

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

    await db.connect();

    const userResult = await db.query('SELECT id FROM users WHERE cognito_sub = $1', [cognitoSub]);
    if (userResult.rows.length === 0) return response(404, { error: 'User not found' });

    const userId = userResult.rows[0].id;

    const result = await db.query(
      'DELETE FROM jobs WHERE id = $1 AND user_id = $2 RETURNING id',
      [jobId, userId]
    );

    if (result.rows.length === 0) {
      return response(404, { error: 'Job not found or not authorized' });
    }

    return response(200, { deleted: true });
  } catch (err) {
    console.error('Delete job error:', err);
    if (err.code === 'NotAuthorizedException') return response(401, { error: 'Invalid or expired token' });
    return response(500, { error: 'Internal server error' });
  } finally {
    await db.end().catch(() => {});
  }
};

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
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return response(400, { error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return response(400, { error: 'Password must be at least 8 characters' });
    }

    const cognitoResult = await cognito.signUp({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
    }).promise();

    await db.connect();

    const result = await db.query(
      'INSERT INTO users (cognito_sub, email) VALUES ($1, $2) RETURNING id',
      [cognitoResult.UserSub, email]
    );

    return response(201, {
      userId: result.rows[0].id,
      message: 'Signup successful. Check your email for a confirmation code.',
    });
  } catch (err) {
    console.error('Signup error:', err);

    if (err.code === 'UsernameExistsException') {
      return response(409, { error: 'An account with this email already exists' });
    }
    if (err.code === 'InvalidPasswordException') {
      return response(400, { error: err.message });
    }

    return response(500, { error: 'Internal server error' });
  } finally {
    await db.end().catch(() => {});
  }
};

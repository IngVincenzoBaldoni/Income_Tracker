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

    const authResult = await cognito.initiateAuth({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }).promise();

    const tokens = authResult.AuthenticationResult;

    await db.connect();

    const result = await db.query(
      'SELECT id, email, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return response(404, { error: 'User record not found' });
    }

    const user = result.rows[0];

    return response(200, {
      userId: user.id,
      email: user.email,
      accessToken: tokens.AccessToken,
      idToken: tokens.IdToken,
      refreshToken: tokens.RefreshToken,
      expiresIn: tokens.ExpiresIn,
    });
  } catch (err) {
    console.error('Login error:', err);

    if (err.code === 'NotAuthorizedException') {
      return response(401, { error: 'Invalid email or password' });
    }
    if (err.code === 'UserNotConfirmedException') {
      return response(403, { error: 'Email not confirmed. Please check your inbox.' });
    }
    if (err.code === 'UserNotFoundException') {
      return response(401, { error: 'Invalid email or password' });
    }

    return response(500, { error: 'Internal server error' });
  } finally {
    await db.end().catch(() => {});
  }
};

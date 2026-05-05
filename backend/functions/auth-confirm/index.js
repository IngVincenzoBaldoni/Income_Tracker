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

  try {
    const { email, code } = JSON.parse(event.body || '{}');

    if (!email || !code) {
      return response(400, { error: 'Email and confirmation code are required' });
    }

    await cognito.confirmSignUp({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }).promise();

    return response(200, { confirmed: true, message: 'Email confirmed successfully' });
  } catch (err) {
    console.error('Confirm error:', err);

    if (err.code === 'CodeMismatchException') {
      return response(400, { error: 'Invalid confirmation code' });
    }
    if (err.code === 'ExpiredCodeException') {
      return response(400, { error: 'Confirmation code expired. Please request a new one.' });
    }
    if (err.code === 'AliasExistsException') {
      return response(409, { error: 'This email is already confirmed' });
    }

    return response(500, { error: 'Internal server error' });
  }
};

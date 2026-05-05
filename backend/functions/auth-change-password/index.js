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

  try {
    const accessToken = extractToken(event);
    if (!accessToken) {
      return response(401, { error: 'Authorization token required' });
    }

    const { oldPassword, newPassword } = JSON.parse(event.body || '{}');

    if (!oldPassword || !newPassword) {
      return response(400, { error: 'Old password and new password are required' });
    }

    if (newPassword.length < 8) {
      return response(400, { error: 'New password must be at least 8 characters' });
    }

    await cognito.changePassword({
      AccessToken: accessToken,
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword,
    }).promise();

    return response(200, { success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);

    if (err.code === 'NotAuthorizedException') {
      return response(401, { error: 'Incorrect current password' });
    }
    if (err.code === 'InvalidPasswordException') {
      return response(400, { error: err.message });
    }
    if (err.code === 'LimitExceededException') {
      return response(429, { error: 'Too many attempts. Please try again later.' });
    }

    return response(500, { error: 'Internal server error' });
  }
};

const { OAuth2Client } = require('google-auth-library');
const httpError = require('./httpError');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

module.exports = async function verifyGoogle(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) throw httpError(501, 'Google sign-in is not configured on the server');
  if (!credential) throw httpError(400, 'Missing Google credential');

  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  } catch {
    throw httpError(401, 'Google sign-in could not be verified');
  }

  const payload = ticket.getPayload();
  if (!payload.email_verified) throw httpError(401, 'Your Google email is not verified');

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
  };
};
import * as jwt from 'jsonwebtoken';

export function generateJwt(
  payload: string | object | Buffer,
  secret: jwt.Secret,
  expiresIn: jwt.SignOptions['expiresIn'],
) {
  const options: jwt.SignOptions = {};
  if (expiresIn !== undefined) {
    options.expiresIn = expiresIn;
  }
  return jwt.sign(payload, secret, options);
}

export function verifyJwt(token: string, secret: jwt.Secret) {
  try {
    return jwt.verify(token, secret);
  } catch (e) {
    return null;
  }
}

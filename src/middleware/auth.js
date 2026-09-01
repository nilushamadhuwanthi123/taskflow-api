const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const asyncHandler = require('./asyncHandler');

/**
 * Verifies the Bearer JWT on the Authorization header, loads the
 * corresponding user, and attaches it to req.user. Rejects with 401 when
 * the token is missing, malformed, expired, or references a user that no
 * longer exists.
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Not authorized: no token provided');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_err) {
    throw new ApiError(401, 'Not authorized: invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'Not authorized: user no longer exists');
  }

  req.user = user;
  next();
});

module.exports = { protect };

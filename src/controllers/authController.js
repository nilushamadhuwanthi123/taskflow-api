const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

// We only ever persist a SHA-256 hash of the refresh token, never the raw
// value — so a database read alone can't be replayed as a valid token.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Issues a fresh access/refresh token pair for a user and persists the new
// refresh token's hash, replacing (rotating out) whatever was there before.
async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  return { accessToken, refreshToken };
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = await User.create({ name, email, password });
  const { accessToken, refreshToken } = await issueTokenPair(user);

  res.status(201).json({ user, token: accessToken, refreshToken });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { accessToken, refreshToken } = await issueTokenPair(user);

  res.status(200).json({ user, token: accessToken, refreshToken });
});

// POST /api/auth/refresh
// Exchanges a valid, unexpired refresh token for a new access token *and*
// a new refresh token (rotation) — the old refresh token stops working the
// moment a new one is issued, so a leaked-but-unused old token can't be
// replayed after the legitimate client has refreshed.
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (_err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(user);

  res.status(200).json({ token: accessToken, refreshToken: newRefreshToken });
});

// POST /api/auth/logout
// Revokes the current user's refresh token so it (and any copy of it)
// can no longer be exchanged for new access tokens. The access token
// already issued keeps working until it naturally expires.
const logout = asyncHandler(async (req, res) => {
  req.user.refreshTokenHash = undefined;
  await req.user.save();

  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = { register, login, refresh, logout };

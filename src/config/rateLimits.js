// Central place for rate-limit configuration so the actual limiter
// middleware and anything that reports on it (GET /api/stats) can't
// silently drift out of sync with each other.
const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
};

module.exports = { AUTH_RATE_LIMIT };

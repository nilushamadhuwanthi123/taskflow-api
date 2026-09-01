const metrics = require('../utils/metrics');
const { AUTH_RATE_LIMIT } = require('../config/rateLimits');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/stats
// Publicly readable, in-memory request metrics for this running process:
// total requests, a breakdown by HTTP method and by response status class,
// plus the currently configured auth rate limit. No per-user or personally
// identifiable data is exposed here — it's operational visibility, not a
// user-facing dashboard.
const getStats = asyncHandler(async (req, res) => {
  res.status(200).json({
    ...metrics.snapshot(),
    authRateLimit: AUTH_RATE_LIMIT,
  });
});

module.exports = { getStats };

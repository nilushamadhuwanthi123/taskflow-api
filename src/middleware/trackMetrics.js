const metrics = require('../utils/metrics');

// Records every request's method + final status code once the response has
// actually finished sending, so it counts errors handled by the central
// error handler too, not just the "happy path" routes.
function trackMetrics(req, res, next) {
  res.on('finish', () => {
    metrics.record(req.method, res.statusCode);
  });
  next();
}

module.exports = trackMetrics;

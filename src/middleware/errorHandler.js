const ApiError = require('../utils/ApiError');

/* eslint-disable no-unused-vars */
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Express identifies error-handling middleware by arity (4 args), so all
// four parameters must stay even though `next` is unused.
function errorHandler(err, req, res, next) {
  let { statusCode, message } = err;
  const details = err.details;

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already in use`;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (!statusCode) statusCode = 500;
  if (!message || statusCode === 500) message = message || 'Internal server error';

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}
/* eslint-enable no-unused-vars */

module.exports = { notFound, errorHandler };

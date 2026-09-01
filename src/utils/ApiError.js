/**
 * Lightweight typed error for HTTP handlers. Anything thrown/passed to
 * next() as an ApiError is rendered with its own status code and message
 * by the central error handler; anything else is treated as a 500.
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;

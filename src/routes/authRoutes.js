const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { AUTH_RATE_LIMIT } = require('../config/rateLimits');
const { register, login, refresh, logout } = require('../controllers/authController');

const router = express.Router();

// Auth endpoints are a common brute-force / credential-stuffing target,
// so they get a tighter rate limit than the rest of the API. The
// windowMs/max values live in config/rateLimits so GET /api/stats can
// report the exact same numbers without risk of the two drifting apart.
const authLimiter = rateLimit({
  ...AUTH_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many auth requests, please try again later' } },
});

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.post(
  '/refresh',
  authLimiter,
  [body('refreshToken').notEmpty().withMessage('refreshToken is required')],
  validate,
  refresh
);

router.post('/logout', protect, logout);

module.exports = router;

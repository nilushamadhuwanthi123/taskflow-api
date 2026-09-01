const express = require('express');
const { getStats } = require('../controllers/statsController');

const router = express.Router();

// GET /api/stats - lightweight, public request/observability metrics.
router.get('/', getStats);

module.exports = router;

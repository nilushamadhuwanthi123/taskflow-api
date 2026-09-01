const express = require('express');

const router = express.Router();

// GET /health - used by the Docker HEALTHCHECK instruction and by Render
// to determine whether the container is ready to receive traffic.
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

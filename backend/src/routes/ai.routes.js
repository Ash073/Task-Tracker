const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { generateMotivationQuote, resolveAIConfig } = require('../services/apiAI.service');
const { getLocalQuote } = require('../services/localAI.service');

const router = express.Router();

// Generate quote
router.post('/quote', protect, async (req, res) => {
  try {
    const { taskName, priority, goal, minutesToDeadline } = req.body;
    const quote = await generateMotivationQuote({ taskName, priority, goal, minutesToDeadline }, req.user.settings);
    res.json({ quote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check AI status
router.get('/status', protect, async (req, res) => {
  const config = resolveAIConfig(req.user.settings);
  res.json({ provider: config.provider, mode: req.user.settings?.aiMode || 'auto' });
});

// Local quote (no API)
router.post('/local-quote', protect, (req, res) => {
  const { priority, goal } = req.body;
  res.json({ quote: getLocalQuote(priority || 'Medium', goal || '') });
});

module.exports = router;

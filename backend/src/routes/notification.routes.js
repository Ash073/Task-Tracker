const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const NotificationLog = require('../models/notification.model');

const router = express.Router();

// Get notification history
router.get('/', protect, async (req, res) => {
  try {
    const logs = await NotificationLog.find({ userId: req.user._id }, { limit: 50 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification delivered (from push)
router.post('/:id/delivered', protect, async (req, res) => {
  try {
    await NotificationLog.findByIdAndUpdate(req.params.id, { delivered: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save push subscription
router.post('/subscribe', protect, async (req, res) => {
  try {
    const User = require('../models/user.model');
    await User.findByIdAndUpdate(req.user._id, {
      'settings.pushSubscription': req.body.subscription,
      'settings.pushNotifications': true,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

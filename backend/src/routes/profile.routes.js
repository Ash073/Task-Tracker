const express = require('express');
const User = require('../models/user.model');
const Task = require('../models/task.model');
const { protect } = require('../middleware/auth.middleware');
const { detectGoal, analyzeWeakAreas } = require('../services/localAI.service');
const { generateGoalInsights } = require('../services/apiAI.service');

const router = express.Router();

// Get profile
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id, { select: '-password' });
    const completedTasks = await Task.countDocuments({ userId: req.user._id, status: 'completed' });
    res.json({ ...user, completedTasksCount: completedTasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile / settings
router.put('/', protect, async (req, res) => {
  try {
    const allowed = ['name', 'goal', 'mode', 'settings', 'expoPushToken', 'avatarUrl'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, select: '-password' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze goal
router.post('/analyze', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id });
    const detectedGoal = detectGoal(tasks);
    const weakAreas = analyzeWeakAreas(tasks);
    const insights = await generateGoalInsights(tasks, req.user.goal, req.user.settings);

    await User.findByIdAndUpdate(req.user._id, { detectedGoal, weakAreas });
    res.json({ detectedGoal, weakAreas, insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, goal } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({ name, email, password, goal, xp: 0, level: 1, mode: 'simple', streak: 0 });
    const token = signToken(user.id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken(user._id);
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, goal: user.goal, xp: user.xp, level: user.level, mode: user.mode, settings: user.settings, streak: user.streak, detectedGoal: user.detectedGoal, avatarUrl: user.avatarUrl } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;

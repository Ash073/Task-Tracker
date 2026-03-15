const express = require('express');
const ShoppingList = require('../models/shopping.model');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const lists = await ShoppingList.find({ userId: req.user._id, status: 'active' });
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const list = await ShoppingList.create({ ...req.body, userId: req.user._id });
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const list = await ShoppingList.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await ShoppingList.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle item checked
router.patch('/:id/items/:itemId', protect, async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ _id: req.params.id, userId: req.user._id });
    if (!list) return res.status(404).json({ error: 'List not found' });
    const updated = await ShoppingList.toggleItem(req.params.id, req.params.itemId);
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

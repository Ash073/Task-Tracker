const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth.middleware');
const { parseExcelTasks, parseExcelShopping } = require('../services/excel.service');
const { imageToShoppingItems } = require('../services/ocr.service');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) cb(null, true);
    else cb(new Error('Invalid file type'));
  },
});

// Parse Excel for tasks
router.post('/excel/tasks', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const tasks = await parseExcelTasks(req.file.buffer);
    const count = tasks.length;
    res.json({ tasks, count });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Parse Excel for tasks (base64 — mobile)
router.post('/excel/tasks/base64', protect, express.json({ limit: '10mb' }), async (req, res) => {
  try {
    let { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No file data' });
    
    // Strip data URI prefix if present
    if (data.includes('base64,')) {
      data = data.split('base64,')[1];
    }

    const buffer = Buffer.from(data, 'base64');
    const tasks = await parseExcelTasks(buffer);
    const count = tasks.length;
    res.json({ tasks, count });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Parse Excel for shopping
router.post('/excel/shopping', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const items = await parseExcelShopping(req.file.buffer);
    res.json({ items, count: items.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Parse Excel for shopping (base64 — mobile)
router.post('/excel/shopping/base64', protect, express.json({ limit: '10mb' }), async (req, res) => {
  try {
    let { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No file data' });
    
    // Strip data URI prefix if present
    if (data.includes('base64,')) {
      data = data.split('base64,')[1];
    }

    const buffer = Buffer.from(data, 'base64');
    const items = await parseExcelShopping(buffer);
    res.json({ items, count: items.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// OCR image → shopping items
router.post('/ocr', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    // Write to temp file for Tesseract
    const fs = require('fs');
    const os = require('os');
    const tmpPath = path.join(os.tmpdir(), `ocr_${Date.now()}${path.extname(req.file.originalname)}`);
    fs.writeFileSync(tmpPath, req.file.buffer);
    const result = await imageToShoppingItems(tmpPath);
    fs.unlinkSync(tmpPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OCR image (base64 — mobile)
router.post('/ocr/base64', protect, express.json({ limit: '50mb' }), async (req, res) => {
  try {
    let { data, extension } = req.body;
    if (!data) return res.status(400).json({ error: 'No image data provided' });
    
    // Universal Base64 Cleanup: Strip anything before the actual data
    const cleanData = data.includes('base64,') ? data.split('base64,')[1] : data;

    const fs = require('fs');
    const os = require('os');
    const ext = extension || '.jpg';
    const tmpPath = path.join(os.tmpdir(), `ocr_${Date.now()}${ext}`);
    
    try {
      fs.writeFileSync(tmpPath, Buffer.from(cleanData, 'base64'));
    } catch (writeErr) {
      throw new Error('Failed to process image buffer: ' + writeErr.message);
    }

    const result = await imageToShoppingItems(tmpPath);
    
    // Clean up
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    
    res.json(result);
  } catch (err) {
    console.error('[OCR Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

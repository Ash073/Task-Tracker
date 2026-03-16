require('dotenv').config(); // Final Fallback: Cloudmersive + ExcelJS + OpenAI
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const profileRoutes = require('./routes/profile.routes');
const aiRoutes = require('./routes/ai.routes');
const notificationRoutes = require('./routes/notification.routes');
const shoppingRoutes = require('./routes/shopping.routes');
const uploadRoutes = require('./routes/upload.routes');
const taskEngine = require('../taskEngine');

const { initScheduler } = require('./services/scheduler.service');
const { connectDB } = require('./config/db');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/upload', uploadRoutes);
app.use(taskEngine);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`TaskTracker backend running on port ${PORT}`);
    initScheduler();
  });
  // Extend server timeout to 3 minutes for heavy AI/OCR tasks
  server.timeout = 180000;
});

const express = require('express');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const { protect } = require('../middleware/auth.middleware');
const { adjustSchedule, detectGoal, analyzeWeakAreas } = require('../services/localAI.service');
const { scheduleTaskNotification, cancelJobs } = require('../services/notification.service');

const router = express.Router();

// Get all tasks
router.get('/', protect, async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.startTime = { 
        $gte: new Date(d.setHours(0,0,0,0)), 
        $lt: new Date(d.setHours(23,59,59,999)) 
      };
    }
    const tasks = await Task.find(filter);
    
    // Sort tasks by startTime for better front-end segregation
    tasks.sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(a.startTime) - new Date(b.startTime);
    });

    console.log(`[API Debug] Sent tasks: ${tasks.length}`);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single create
router.post('/', protect, async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user._id };
    if (data.startTime && data.duration) {
      data.endTime = new Date(new Date(data.startTime).getTime() + data.duration * 60000);
    }
    const task = await Task.create(data);
    const jobs = await scheduleTaskNotification(task, req.user);
    const updatedTask = await Task.findOneAndUpdate({ _id: task.id }, { scheduledJobs: jobs });
    res.status(201).json(updatedTask || task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Import
router.post('/bulk', protect, async (req, res) => {
  try {
    const { tasks: raw } = req.body;
    if (!raw || !Array.isArray(raw)) return res.status(400).json({ error: 'Invalid data' });

    console.log(`[API Debug] Received tasks: ${raw.length}`);

    const safeDate = (dt) => {
      if (!dt) return null;
      const d = new Date(dt);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    // Map to final format before scheduling
    const tasksToProcess = raw.map(t => {
      // Prioritize startTime from extraction engine if available
      let st = t.startTime;
      if (!st && t.date && t.date !== 'TBD' && t.time && t.time !== 'TBD') {
        const timePart = t.time.split(/[-–]|to/i)[0].trim().toLowerCase();
        const isPM = timePart.includes('pm') || t.time.toLowerCase().includes('pm');
        const timeOnly = timePart.replace(/[apm\s]/g, '');
        let [h, m] = timeOnly.split(':').map(Number);
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
        const isoTime = `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}:00`;
        st = `${t.date}T${isoTime}`;
      }

      const cleanStart = safeDate(st);
      const cleanEnd = t.endTime ? safeDate(t.endTime) : (cleanStart ? safeDate(new Date(new Date(cleanStart).getTime() + (parseInt(t.duration) || 60) * 60000)) : null);

      return {
        name: t.title || t.name || t.task || 'Untitled Task',
        priority: t.priority ? (t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase()) : 'Low',
        startTime: cleanStart,
        endTime: cleanEnd,
        duration: parseInt(t.duration) || 60,
        xpReward: parseInt(t.xpReward) || parseInt(t.xp) || 25,
        link: t.link || (t.links && t.links.length > 0 ? t.links[0] : ''),
        category: t.category || 'Work',
        goalTag: t.goalTag || '',
        notes: t.notes || '',
        userId: req.user._id,
        source: 'excel',
        reminder15min: t.reminder === '5min_before_after'
      };
    });

    // Run Engine (adjustSchedule expects startTime to be a string or Date, it handles conversion)
    const { tasks: scheduled, conflicts } = adjustSchedule(tasksToProcess);

    // Save All
    const created = await Task.insertMany(scheduled);
    console.log(`[API Debug] Saved tasks: ${created.length}`);

    // Post-import logic
    const goal = detectGoal(created);
    const weak = analyzeWeakAreas(created);
    await User.findByIdAndUpdate(req.user._id, { detectedGoal: goal, weakAreas: weak });

    for (const t of created) {
      if (t.startTime) {
        const jobs = await scheduleTaskNotification(t, req.user);
        await Task.findOneAndUpdate({ _id: t.id }, { scheduledJobs: jobs });
      }
    }

    res.status(201).json({ tasks: created, conflicts, detectedGoal: goal });
  } catch (err) {
    console.error('[Bulk Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Update
router.put('/:id', protect, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.startTime && data.duration) {
      data.endTime = new Date(new Date(data.startTime).getTime() + data.duration * 60000);
    }
    const oldTask = await Task.findById(req.params.id);
    if (oldTask && oldTask.scheduledJobs) cancelJobs(oldTask.scheduledJobs);

    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, data);
    if (task && task.startTime && task.status !== 'completed') {
      const jobs = await scheduleTaskNotification(task, req.user);
      await Task.findOneAndUpdate({ _id: task.id }, { scheduledJobs: jobs });
    }
    const finalTask = await Task.findById(req.params.id);
    res.json(finalTask || task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'completed', completedAt: new Date() }
    );
    if (!task) return res.status(404).json({ error: 'Not found' });

    const user = req.user;
    const today = new Date().toDateString();
    const last = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : null;
    let streak = user.streak || 0;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      streak = last === yesterday ? streak + 1 : 1;
    }

    const nextXp = (user.xp || 0) + (task.xpReward || 0);
    await User.findByIdAndUpdate(user._id, {
      xp: nextXp,
      streak,
      lastActiveDate: new Date(),
      $inc: { completedTasksCount: 1 }
    });

    cancelJobs(task.scheduledJobs);
    res.json({ task, xpGained: task.xpReward });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete
router.post('/bulk-delete', protect, async (req, res) => {
  try {
    const { taskIds } = req.body;
    console.log(`[API Debug] Bulk deleting ${taskIds?.length} tasks for user ${req.user._id}`);
    
    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({ error: 'taskIds array is required' });
    }

    const tasks = await Task.find({ _id: { $in: taskIds }, userId: req.user._id });
    console.log(`[API Debug] Found ${tasks.length} tasks to delete`);

    for (const t of tasks) {
      if (t.scheduledJobs && Array.isArray(t.scheduledJobs)) {
        cancelJobs(t.scheduledJobs);
      }
    }

    await Task.deleteMany({ _id: { $in: taskIds }, userId: req.user._id });
    console.log(`[API Debug] Successfully deleted tasks`);
    
    res.json({ success: true, count: tasks.length });
  } catch (err) {
    console.error('[Bulk Delete Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Single delete
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (task) cancelJobs(task.scheduledJobs);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

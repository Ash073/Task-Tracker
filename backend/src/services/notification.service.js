const schedule = require('node-schedule');
const { Expo } = require('expo-server-sdk');
const NotificationLog = require('../models/notification.model');
const { generateMotivationQuote } = require('./apiAI.service');
const { getReminderStrength } = require('./localAI.service');

const expo = new Expo();
const jobRegistry = new Map();

/**
 * Schedule a task notification lifecycle
 * 1. 5 minutes before START
 * 2. EXACT START
 * 3. 5 minutes after START (if not completed)
 * 4. 5 minutes before END (if not completed)
 */
async function scheduleTaskNotification(task, user) {
  const jobs = [];
  if (!task.startTime) return jobs;

  const startTime = new Date(task.startTime);
  const duration = parseInt(task.duration) || 60;
  const endTime = new Date(startTime.getTime() + duration * 60000);
  const now = new Date();

  // Helper to schedule with safety
  const safeSchedule = (id, time, fn) => {
    if (time <= now) return;
    const job = schedule.scheduleJob(id, time, fn);
    if (job) {
      jobRegistry.set(id, job);
      jobs.push(id);
    }
  };

  // 1. 5 Minutes Before Start
  safeSchedule(`prep_${task._id}`, new Date(startTime.getTime() - 5 * 60000), async () => {
    await logAndNotify(user, {
      taskId: task._id,
      type: 'critical',
      title: `🚀 Deployment Preview: ${task.name}`,
      body: `Initial phase starts in 5 minutes. Ready to maintain your streak?`,
      quote: "Success is preparation meeting opportunity.",
    });
  });

  // 2. Exact Start
  safeSchedule(`start_${task._id}`, startTime, async () => {
    const quote = await generateMotivationQuote({
      taskName: task.name,
      priority: task.priority,
      goal: user.detectedGoal || user.goal,
    }, user.settings);

    await logAndNotify(user, {
      taskId: task._id,
      type: 'reminder',
      title: `⚡ System Execute: ${task.name}`,
      body: `Operation "${task.name}" is now active. Target duration: ${duration}min.`,
      quote,
    });
  });

  // 3. 5 Minutes After Start (Completion Check)
  safeSchedule(`after_start_${task._id}`, new Date(startTime.getTime() + 5 * 60000), async () => {
    const Task = require('../models/task.model');
    const fresh = await Task.findById(task._id);
    if (!fresh || fresh.status === 'completed') return;

    await logAndNotify(user, {
      taskId: task._id,
      type: 'critical',
      title: `🔥 High Velocity: ${task.name}`,
      body: `You are 5 minutes into the zone. Stay focused, do not break the chain!`,
      quote: "Concentrate all your thoughts upon the work at hand.",
    });
  });

  // 4. 5 Minutes Before End (Completion Check)
  // Only schedule if duration > 10 min to avoid overlapping with after-start logic
  if (duration >= 10) {
    safeSchedule(`prep_end_${task._id}`, new Date(endTime.getTime() - 5 * 60000), async () => {
      const Task = require('../models/task.model');
      const fresh = await Task.findById(task._id);
      if (!fresh || fresh.status === 'completed') return;

      await logAndNotify(user, {
        taskId: task._id,
        type: 'reminder',
        title: `🏁 Final Sprint: ${task.name}`,
        body: `5 minutes remaining! Wrap up your current module and secure the win.`,
        quote: "Finishing is just as important as starting.",
      });
    });
  }

  // Deadline & Repeating logic preserved for system integrity
  if (task.deadline) {
    safeSchedule(`deadline_${task._id}`, new Date(new Date(task.deadline).getTime() - 15 * 60000), async () => {
      await logAndNotify(user, {
        taskId: task._id,
        type: 'critical',
        title: `🔴 CRITICAL TIMEOUT: ${task.name}`,
        body: `URGENT: Hard deadline in 15 minutes! Accelerate now.`,
      });
    });
  }

  return jobs;
}

/**
 * Log to DB and PUSH to Android/iOS via Expo
 */
async function logAndNotify(user, payload) {
  const { taskId, type, title, body, quote = '', link = '' } = payload;
  
  // 1. Log to Database
  try {
    await NotificationLog.create({ userId: user._id, taskId, type, title, body, quote, link, delivered: true });
  } catch (err) {
    console.error('DB Log Error:', err.message);
  }

  // 2. Send Push Notification if token exists
  if (user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
    const messages = [{
      to: user.expoPushToken,
      sound: 'default',
      title,
      body: quote ? `${body}\n\n"${quote}"` : body,
      data: { taskId, link, type },
      priority: 'high',
      channelId: type === 'critical' ? 'critical' : 'default',
    }];

    try {
      const chunks = expo.chunkPushNotifications(messages);
      for (let chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch (error) {
      console.error('Expo Push Error:', error);
    }
  }
}

async function scheduleSimpleReminder(reminder, userId) {
  const jobId = `simple_${userId}_${reminder.type}_${reminder.time}`;
  const [hour, minute] = reminder.time.split(':').map(Number);
  const cronExpr = `${minute} ${hour} * * *`;

  const User = require('../models/user.model');
  const job = schedule.scheduleJob(jobId, cronExpr, async () => {
    const user = await User.findById(userId);
    if (user) {
      await logAndNotify(user, {
        type: 'simple',
        title: reminder.title,
        body: reminder.body,
      });
    }
  });

  if (job) jobRegistry.set(jobId, job);
  return jobId;
}

function cancelJob(jobId) {
  const job = jobRegistry.get(jobId);
  if (job) {
    job.cancel();
    jobRegistry.delete(jobId);
  }
}

function cancelJobs(jobIds = []) {
  for (const id of jobIds) cancelJob(id);
}

async function restoreScheduledJobs() {
  const Task = require('../models/task.model');
  const User = require('../models/user.model');

  const tasks = await Task.find({
    status: { $in: ['pending', 'in_progress'] },
    startTime: { $gt: new Date() },
  });

  for (const task of tasks) {
    const user = await User.findById(task.userId);
    if (user) await scheduleTaskNotification(task, user);
  }
  console.log(`[NotificationEngine] Restored ${tasks.length} task lifecycles.`);
}

module.exports = {
  scheduleTaskNotification,
  scheduleSimpleReminder,
  cancelJob,
  cancelJobs,
  logNotification: logAndNotify, // Export as alias for compatibility
  restoreScheduledJobs,
};

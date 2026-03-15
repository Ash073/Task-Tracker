const { restoreScheduledJobs } = require('./notification.service');

async function initScheduler() {
  try {
    await restoreScheduledJobs();
  } catch (err) {
    console.error('Scheduler init error:', err.message);
  }
}

module.exports = { initScheduler };

export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  },

  send({ title, body, icon = '/logo192.png', tag, data = {} }) {
    if (Notification.permission !== 'granted') return null;
    const n = new Notification(title, {
      body,
      icon,
      tag,
      badge: '/logo192.png',
      requireInteraction: data.critical || false,
      silent: false,
      data,
    });
    n.onclick = () => {
      window.focus();
      if (data.link) window.open(data.link, '_blank');
      n.close();
    };
    return n;
  },

  scheduleLocal({ title, body, delayMs, tag, data = {} }) {
    if (delayMs <= 0) return;
    setTimeout(() => this.send({ title, body, tag, data }), delayMs);
  },

  scheduleTaskNotification(task) {
    const now = Date.now();
    const start = task.startTime ? new Date(task.startTime).getTime() : null;
    const deadline = task.deadline ? new Date(task.deadline).getTime() : null;

    const priorityEmoji = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' };
    const icon = priorityEmoji[task.priority] || '⏰';

    if (start && start > now) {
      this.scheduleLocal({
        title: `${icon} ${task.name}`,
        body: `[${task.priority}] Starting now • ${task.duration}min${task.motivationQuote ? '\n' + task.motivationQuote : ''}`,
        delayMs: start - now,
        tag: `start_${task._id}`,
        data: { critical: task.priority === 'Critical', link: task.link, taskId: task._id },
      });
    }

    if (deadline) {
      const fifteenBefore = deadline - 15 * 60 * 1000;
      if (fifteenBefore > now) {
        this.scheduleLocal({
          title: `⚠️ Deadline soon: ${task.name}`,
          body: `15 minutes remaining! ${task.priority} priority task`,
          delayMs: fifteenBefore - now,
          tag: `deadline_${task._id}`,
          data: { critical: true, link: task.link, taskId: task._id },
        });
      }
    }
  },
};

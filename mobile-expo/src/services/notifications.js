import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
  if (error) return;
});

// Lazy loader for Notifications to avoid top-level side effects in Expo Go SDK 54
let Notifications = null;
const getNotifications = () => {
  if (Notifications) return Notifications;
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      }),
    });
    return Notifications;
  } catch (e) {
    console.warn('[Notifications] Failed to load expo-notifications library:', e.message);
    return null;
  }
};

export const notificationService = {
  async requestPermission() {
    const n = getNotifications();
    if (!n) return false;

    const { status: existingStatus } = await n.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await n.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      await n.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: n.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
        sound: 'default',
      });
      await n.setNotificationChannelAsync('critical', {
        name: 'Critical Alerts',
        importance: n.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#ef4444',
        sound: 'default',
        bypassDnd: true,
      });
    }
    return true;
  },

  async getPushTokenAsync() {
    if (Platform.OS === 'web') return null;
    const n = getNotifications();
    if (!n) return null;

    try {
      const isExpoGo = Constants.executionEnvironment === 'storeClient';
      if (isExpoGo) {
        // In SDK 53/54, this is mandatory to avoid the loud error
        console.log('[Notifications] Expo Go detected: Remote push notifications are disabled in SDK 54. Local mode active.');
        return null;
      }

      const { status } = await n.getPermissionsAsync();
      if (status !== 'granted') return null;
      
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                        Constants.easConfig?.projectId ||
                        (Constants.manifest2?.extra?.eas?.projectId);
      
      if (!projectId) {
        console.log('[Notifications] No EAS projectId found. Remote notifications will be disabled.');
        return null;
      }

      const token = (await n.getExpoPushTokenAsync({ projectId })).data;
      return token;
    } catch (e) {
      console.warn('[Notifications] Failed to fetch device push token:', e.message);
      return null;
    }
  },

  async scheduleLocal({ title, body, delaySeconds, tag, data = {}, channelId = 'default' }) {
    if (delaySeconds <= 0) return null;
    const n = getNotifications();
    if (!n) return null;

    return await n.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, tag },
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: {
        type: n.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(delaySeconds)),
      },
    });
  },

  async scheduleTaskNotification(task) {
    const now = Date.now();
    const start = task.startTime ? new Date(task.startTime).getTime() : null;
    const durationMins = parseInt(task.duration) || 60;
    const end = start ? start + durationMins * 60000 : null;
    const taskId = task._id || task.id;

    const priorityEmoji = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' };
    const icon = priorityEmoji[task.priority] || '⏰';

    // 1. 5 Minutes Before Start
    if (start && start - 5 * 60 * 1000 > now) {
      await this.scheduleLocal({
        title: `🚀 Prep Phase: ${task.name}`,
        body: `Starting in 5 minutes. Ready?`,
        delaySeconds: (start - 5 * 60 * 1000 - now) / 1000,
        tag: `prep_${taskId}`,
        data: { taskId },
      });
    }

    // 2. Exact Start
    if (start && start > now) {
      await this.scheduleLocal({
        title: `${icon} Active Now: ${task.name}`,
        body: `Operation began. Goal: ${durationMins}min.`,
        delaySeconds: (start - now) / 1000,
        tag: `start_${taskId}`,
        data: { taskId },
      });
    }

    // 3. 5 Minutes After Start
    if (start && start + 5 * 60 * 1000 > now) {
       await this.scheduleLocal({
         title: `⚡ Maintaining Momentum: ${task.name}`,
         body: `5 minutes in! Keep pushing.`,
         delaySeconds: (start + 5 * 60 * 1000 - now) / 1000,
         tag: `after_start_${taskId}`,
         data: { taskId },
       });
    }

    // 4. 5 Minutes Before End
    if (end && end - 5 * 60 * 1000 > now) {
       await this.scheduleLocal({
         title: `🏁 Final Sprint: ${task.name}`,
         body: `5 minutes remaining! Secure the win.`,
         delaySeconds: (end - 5 * 60 * 1000 - now) / 1000,
         tag: `prep_end_${taskId}`,
         data: { taskId },
       });
    }
  },

  async cancelAll() {
    const n = getNotifications();
    if (n) await n.cancelAllScheduledNotificationsAsync();
  },

  onNotificationReceived(callback) {
    const n = getNotifications();
    if (n) return n.addNotificationReceivedListener(callback);
    return { remove: () => {} };
  },

  onNotificationResponse(callback) {
    const n = getNotifications();
    if (n) return n.addNotificationResponseReceivedListener(callback);
    return { remove: () => {} };
  },
};

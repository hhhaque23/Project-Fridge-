// Smart Notifications Service - schedules expiry reminders and weekly digests
import { Platform } from 'react-native';
import type { InventoryItem } from '@/lib/types';

let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch {}
}

export interface NotificationConfig {
  expiry_alerts: boolean;
  weekly_report: boolean;
  scan_reminders: boolean;
  quiet_hours_start: string; // HH:MM
  quiet_hours_end: string;
  frequency: 'realtime' | 'daily_digest' | 'weekly_summary';
}

export const DEFAULT_CONFIG: NotificationConfig = {
  expiry_alerts: true,
  weekly_report: true,
  scan_reminders: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  frequency: 'daily_digest',
};

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const permission = await window.Notification.requestPermission();
    return permission === 'granted';
  }
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleExpiryNotifications(items: InventoryItem[]): Promise<number> {
  if (Platform.OS === 'web') return scheduleWebNotifications(items);
  if (!Notifications) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  let scheduled = 0;
  const now = new Date();

  for (const item of items) {
    const expiry = new Date(item.expiry_date);
    expiry.setHours(9, 0, 0, 0); // 9am notifications
    const oneDayBefore = new Date(expiry.getTime() - 24 * 60 * 60 * 1000);

    if (oneDayBefore > now) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${item.ingredient?.name || 'Item'} expires tomorrow`,
            body: `Use it in a recipe today, or freeze to save it for later.`,
            data: { itemId: item.id, type: 'expiry_warning' },
          },
          trigger: { date: oneDayBefore } as any,
        });
        scheduled++;
      } catch {}
    }
  }
  return scheduled;
}

function scheduleWebNotifications(items: InventoryItem[]): number {
  // Web Notifications API doesn't support scheduling - just count what would have been scheduled
  if (typeof window === 'undefined' || !('Notification' in window)) return 0;
  const now = new Date();
  return items.filter((item) => {
    const expiry = new Date(item.expiry_date);
    const oneDayBefore = new Date(expiry.getTime() - 24 * 60 * 60 * 1000);
    return oneDayBefore > now;
  }).length;
}

export async function scheduleWeeklyDigest(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false;

  try {
    const trigger = {
      weekday: 1, // Sunday
      hour: 18, // 6pm
      minute: 0,
      repeats: true,
    };
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your weekly waste report',
        body: 'See how much food and money you saved this week.',
        data: { type: 'weekly_digest' },
      },
      trigger: trigger as any,
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelAllScheduled(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

export async function showTestNotification(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (window.Notification.permission !== 'granted') {
      const result = await window.Notification.requestPermission();
      if (result !== 'granted') return false;
    }
    new window.Notification('FreshScan Test', {
      body: 'Notifications are working! Your spinach expires tomorrow.',
      icon: '/favicon.ico',
    });
    return true;
  }
  if (!Notifications) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FreshScan Test',
        body: 'Notifications are working! Your spinach expires tomorrow.',
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}

import { useState, useEffect, useCallback } from 'react';
import type {
  EmailNotification,
  NotificationSummary,
} from '../types/notifications';
import * as nApi from '../lib/notificationApi';

export interface NotificationStore {
  loading: boolean;
  notifications: EmailNotification[];
  summary: NotificationSummary;
  activeLeads: EmailNotification[];
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
  markAllRead: () => void;
  refresh: () => void;
}

const EMPTY_SUMMARY: NotificationSummary = {
  totalUnread: 0,
  actionRequired: 0,
  byPlatform: {},
  byCategory: {},
};

export function useNotificationStore(): NotificationStore {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>(EMPTY_SUMMARY);
  const [activeLeads, setActiveLeads] = useState<EmailNotification[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const [notifs, sum, leads] = await Promise.all([
        nApi.fetchNotifications({ limit: 50 }),
        nApi.fetchNotificationSummary(),
        nApi.fetchActiveLeads(),
      ]);
      setNotifications(notifs);
      setSummary(sum);
      setActiveLeads(leads);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'read' as const } : n))
    );
    setSummary((prev) => ({
      ...prev,
      totalUnread: Math.max(0, prev.totalUnread - 1),
    }));
    nApi.markNotificationRead(id).catch(console.error);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    nApi.dismissNotification(id).catch(console.error);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: 'read' as const }))
    );
    setSummary((prev) => ({ ...prev, totalUnread: 0, actionRequired: 0 }));
    nApi.markAllNotificationsRead().catch(console.error);
  }, []);

  return {
    loading,
    notifications,
    summary,
    activeLeads,
    markRead,
    dismiss,
    markAllRead,
    refresh: loadAll,
  };
}

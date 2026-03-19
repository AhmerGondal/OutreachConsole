import { useState, useEffect, useCallback } from 'react';
import type { TrackedApplication, ApplicationStatus } from '../types/notifications';
import * as nApi from '../lib/notificationApi';

export interface ApplicationStore {
  loading: boolean;
  applications: TrackedApplication[];
  statusFilter: ApplicationStatus | undefined;
  setStatusFilter: (s: ApplicationStatus | undefined) => void;
  updateStatus: (id: string, status: ApplicationStatus) => void;
  refresh: () => void;
}

export function useApplicationStore(): ApplicationStore {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | undefined>();

  const load = useCallback(async (filter?: ApplicationStatus) => {
    try {
      const data = await nApi.fetchTrackedApplications(
        filter ? { statusFilter: filter } : undefined
      );
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(statusFilter);
    const interval = setInterval(() => load(statusFilter), 60_000);
    return () => clearInterval(interval);
  }, [load, statusFilter]);

  const updateStatus = useCallback((id: string, status: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, applicationStatus: status } : a))
    );
    nApi.updateApplicationStatus(id, status).catch(console.error);
  }, []);

  return {
    loading,
    applications,
    statusFilter,
    setStatusFilter,
    updateStatus,
    refresh: () => load(statusFilter),
  };
}

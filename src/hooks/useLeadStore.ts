import { useState, useCallback, useMemo, useEffect } from 'react';
import type { LeadRecord, LeadPlatform, LeadStatus } from '../types/leadTracker';
import { filterLeads, countResponses } from '../lib/leadTracker';
import * as api from '../lib/api';

export interface LeadStore {
  loading: boolean;
  leads: LeadRecord[];
  addLead: (partial: { name: string; companyName: string; platform: LeadPlatform; profileUrl?: string; notes?: string }) => void;
  removeLead: (id: string) => void;
  updateLead: (id: string, fields: Partial<Omit<LeadRecord, 'id' | 'createdAt'>>) => void;
  setLeads: (leads: LeadRecord[]) => void;
  importLeads: (leads: LeadRecord[]) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: LeadStatus | undefined;
  setStatusFilter: (s: LeadStatus | undefined) => void;
  platformFilter: LeadPlatform | undefined;
  setPlatformFilter: (p: LeadPlatform | undefined) => void;
  filteredLeads: LeadRecord[];
  responseCount: number;

  todayCount: number;
  weekTotal: number;
  monthTotal: number;
  increment: () => void;
  decrement: () => void;
}

export function useLeadStore(): LeadStore {
  const [loading, setLoading] = useState(true);
  const [leads, setLeadsState] = useState<LeadRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>();
  const [platformFilter, setPlatformFilter] = useState<LeadPlatform | undefined>();

  const [todayCount, setTodayCount] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);

  // Load all data on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Try localStorage migration first
        const migrated = await api.migrateLocalStorageLeads();
        if (migrated > 0) {
          console.log(`Migrated ${migrated} leads from localStorage to Supabase`);
        }

        const [leadsData, today, week, month] = await Promise.all([
          api.fetchLeads(),
          api.getTodayCount(),
          api.getCountsInRange(...Object.values(api.getWeekDateRange()) as [string, string]),
          api.getCountsInRange(...Object.values(api.getMonthDateRange()) as [string, string]),
        ]);

        if (cancelled) return;
        setLeadsState(leadsData);
        setTodayCount(today);
        setWeekTotal(week);
        setMonthTotal(month);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const refreshCounters = useCallback(async () => {
    try {
      const [today, week, month] = await Promise.all([
        api.getTodayCount(),
        api.getCountsInRange(...Object.values(api.getWeekDateRange()) as [string, string]),
        api.getCountsInRange(...Object.values(api.getMonthDateRange()) as [string, string]),
      ]);
      setTodayCount(today);
      setWeekTotal(week);
      setMonthTotal(month);
    } catch (err) {
      console.error('Failed to refresh counters:', err);
    }
  }, []);

  const increment = useCallback(() => {
    setTodayCount((prev) => {
      const next = prev + 1;
      api.upsertDailyCount(next).then(() => refreshCounters()).catch(console.error);
      return next;
    });
  }, [refreshCounters]);

  const decrement = useCallback(() => {
    setTodayCount((prev) => {
      const next = Math.max(0, prev - 1);
      api.upsertDailyCount(next).then(() => refreshCounters()).catch(console.error);
      return next;
    });
  }, [refreshCounters]);

  const addLead = useCallback((partial: Parameters<LeadStore['addLead']>[0]) => {
    api.insertLead(partial)
      .then((record) => {
        setLeadsState((prev) => [record, ...prev]);
      })
      .catch(console.error);
  }, []);

  const removeLead = useCallback((id: string) => {
    setLeadsState((prev) => prev.filter((l) => l.id !== id));
    api.deleteLead(id).catch(console.error);
  }, []);

  const updateLead = useCallback((id: string, fields: Partial<Omit<LeadRecord, 'id' | 'createdAt'>>) => {
    setLeadsState((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, ...fields, updatedAt: new Date().toISOString() } : l
      )
    );
    api.updateLead(id, fields).catch(console.error);
  }, []);

  const setLeads = useCallback((newLeads: LeadRecord[]) => {
    setLeadsState(newLeads);
  }, []);

  const importLeads = useCallback((importedLeads: LeadRecord[]) => {
    api.bulkInsertLeads(importedLeads)
      .then(() => api.fetchLeads())
      .then((fresh) => setLeadsState(fresh))
      .catch(console.error);
  }, []);

  const filteredLeads = useMemo(
    () => filterLeads(leads, searchQuery, statusFilter, platformFilter),
    [leads, searchQuery, statusFilter, platformFilter]
  );

  const responseCount = useMemo(() => countResponses(leads), [leads]);

  return {
    loading,
    leads,
    addLead,
    removeLead,
    updateLead,
    setLeads,
    importLeads,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    platformFilter,
    setPlatformFilter,
    filteredLeads,
    responseCount,
    todayCount,
    weekTotal,
    monthTotal,
    increment,
    decrement,
  };
}

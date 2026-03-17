import { supabase } from './supabase';
import type { LeadRecord, LeadPlatform, LeadStatus } from '../types/leadTracker';

// --------------- Helpers ---------------

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// --------------- Row <-> LeadRecord mapping ---------------

interface LeadRow {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  profile_url: string;
  company_name: string;
  response_status: string;
  note: string;
  created_at: string;
  updated_at: string;
}

function rowToLead(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name,
    platform: row.platform as LeadPlatform,
    profileUrl: row.profile_url,
    status: row.response_status as LeadStatus,
    notes: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --------------- Leads CRUD ---------------

export async function fetchLeads(): Promise<LeadRecord[]> {
  const { data, error } = await supabase
    .from('response_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as LeadRow[]).map(rowToLead);
}

export async function insertLead(lead: {
  name: string;
  companyName: string;
  platform: LeadPlatform;
  profileUrl?: string;
  notes?: string;
}): Promise<LeadRecord> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('response_leads')
    .insert({
      user_id: userId,
      name: lead.name,
      company_name: lead.companyName,
      platform: lead.platform,
      profile_url: lead.profileUrl ?? '',
      response_status: 'New',
      note: lead.notes ?? '',
    })
    .select()
    .single();

  if (error) throw error;
  return rowToLead(data as LeadRow);
}

export async function updateLead(
  id: string,
  fields: Partial<Omit<LeadRecord, 'id' | 'createdAt'>>
): Promise<void> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.companyName !== undefined) updates.company_name = fields.companyName;
  if (fields.platform !== undefined) updates.platform = fields.platform;
  if (fields.profileUrl !== undefined) updates.profile_url = fields.profileUrl;
  if (fields.status !== undefined) updates.response_status = fields.status;
  if (fields.notes !== undefined) updates.note = fields.notes;

  const { error } = await supabase
    .from('response_leads')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase
    .from('response_leads')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function bulkInsertLeads(leads: LeadRecord[]): Promise<void> {
  const userId = await getUserId();
  const rows = leads.map((l) => ({
    user_id: userId,
    name: l.name,
    company_name: l.companyName,
    platform: l.platform,
    profile_url: l.profileUrl,
    response_status: l.status,
    note: l.notes,
  }));

  const { error } = await supabase
    .from('response_leads')
    .insert(rows);

  if (error) throw error;
}

// --------------- Daily Outreach Counts ---------------

interface CountRow {
  id: string;
  tracked_date: string;
  outreach_count: number;
}

export async function getTodayCount(): Promise<number> {
  const { data, error } = await supabase
    .from('daily_outreach_counts')
    .select('outreach_count')
    .eq('tracked_date', todayISO())
    .maybeSingle();

  if (error) throw error;
  return data?.outreach_count ?? 0;
}

export async function upsertDailyCount(count: number): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('daily_outreach_counts')
    .upsert(
      {
        user_id: userId,
        tracked_date: todayISO(),
        outreach_count: Math.max(0, count),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,tracked_date' }
    );

  if (error) throw error;
}

export async function getCountsInRange(
  startDate: string,
  endDate: string
): Promise<number> {
  const { data, error } = await supabase
    .from('daily_outreach_counts')
    .select('outreach_count')
    .gte('tracked_date', startDate)
    .lte('tracked_date', endDate);

  if (error) throw error;
  return (data as CountRow[]).reduce((sum, row) => sum + row.outreach_count, 0);
}

export function getWeekDateRange(): { start: string; end: string } {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10),
  };
}

export function getMonthDateRange(): { start: string; end: string } {
  const prefix = todayISO().slice(0, 7);
  return {
    start: `${prefix}-01`,
    end: todayISO(),
  };
}

// --------------- LocalStorage Migration ---------------

export async function migrateLocalStorageLeads(): Promise<number> {
  const STORAGE_PREFIX = 'outreach-os::';
  const raw = localStorage.getItem(`${STORAGE_PREFIX}leads`);
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return 0;

    const leads: LeadRecord[] = parsed;
    await bulkInsertLeads(leads);

    // Clear localStorage after successful migration
    localStorage.removeItem(`${STORAGE_PREFIX}leads`);
    localStorage.removeItem(`${STORAGE_PREFIX}daily-outreach`);
    return leads.length;
  } catch {
    return 0;
  }
}

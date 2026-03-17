import type { LeadRecord, LeadStatus, LeadPlatform } from '../types/leadTracker';

// --------------- FILTERS ---------------

export function filterLeads(
  leads: LeadRecord[],
  query: string,
  statusFilter?: LeadStatus,
  platformFilter?: LeadPlatform,
): LeadRecord[] {
  let filtered = leads;

  if (statusFilter) {
    filtered = filtered.filter((l) => l.status === statusFilter);
  }
  if (platformFilter) {
    filtered = filtered.filter((l) => l.platform === platformFilter);
  }
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.companyName.toLowerCase().includes(q) ||
        l.notes.toLowerCase().includes(q)
    );
  }

  return filtered;
}

// --------------- SIMPLE COUNTS ---------------

export function countByStatus(leads: LeadRecord[], status: LeadStatus): number {
  return leads.filter((l) => l.status === status).length;
}

export function countResponses(leads: LeadRecord[]): number {
  return leads.filter((l) =>
    l.status === 'Replied' || l.status === 'Positive' || l.status === 'Negative' || l.status === 'Meeting Booked'
  ).length;
}

// --------------- EXPORT / IMPORT ---------------

export function exportLeadsJSON(leads: LeadRecord[]): string {
  return JSON.stringify(leads, null, 2);
}

export function importLeadsJSON(json: string): LeadRecord[] | null {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.every((l: unknown) => typeof l === 'object' && l !== null && 'name' in l)) {
      return parsed as LeadRecord[];
    }
    return null;
  } catch {
    return null;
  }
}

// Constants for UI
export const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Replied', 'Positive', 'Negative', 'Follow Up', 'Meeting Booked'];
export const LEAD_PLATFORMS: LeadPlatform[] = ['LinkedIn', 'Email', 'X', 'Wellfound', 'Other'];

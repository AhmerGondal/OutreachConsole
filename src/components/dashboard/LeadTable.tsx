import { Search, Filter, ExternalLink } from 'lucide-react';
import type { LeadRecord, LeadStatus, LeadPlatform } from '../../types/leadTracker';
import { LEAD_STATUSES, LEAD_PLATFORMS } from '../../lib/leadTracker';
import { cn } from '../../lib/cn';

interface LeadTableProps {
  leads: LeadRecord[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: LeadStatus | undefined;
  onStatusFilterChange: (s: LeadStatus | undefined) => void;
  platformFilter: LeadPlatform | undefined;
  onPlatformFilterChange: (p: LeadPlatform | undefined) => void;
  onSelectLead: (lead: LeadRecord) => void;
}

const statusDot: Record<LeadStatus, string> = {
  'New': 'bg-white/40',
  'Contacted': 'bg-accent-light',
  'Replied': 'bg-blue-400',
  'Positive': 'bg-emerald-400',
  'Negative': 'bg-rose-400',
  'Follow Up': 'bg-amber-400',
  'Meeting Booked': 'bg-violet-400',
};

const platformBadge: Record<LeadPlatform, string> = {
  'LinkedIn': 'text-blue-400 bg-blue-500/10',
  'Email': 'text-accent-light bg-accent/10',
  'X': 'text-sky-400 bg-sky-500/10',
  'Wellfound': 'text-orange-400 bg-orange-500/10',
  'Other': 'text-white/40 bg-white/5',
};

export function LeadTable({
  leads, searchQuery, onSearchChange,
  statusFilter, onStatusFilterChange,
  platformFilter, onPlatformFilterChange,
  onSelectLead,
}: LeadTableProps) {
  return (
    <div>
      {/* Search + filter bar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads..."
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 pl-9 pr-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-accent/30"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
            <select
              value={statusFilter ?? ''}
              onChange={(e) => onStatusFilterChange((e.target.value || undefined) as LeadStatus | undefined)}
              className="appearance-none rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 pl-7 pr-8 text-xs text-white/60 outline-none focus:border-accent/30"
            >
              <option value="" className="bg-surface-100">All Status</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-surface-100">{s}</option>
              ))}
            </select>
          </div>
          <select
            value={platformFilter ?? ''}
            onChange={(e) => onPlatformFilterChange((e.target.value || undefined) as LeadPlatform | undefined)}
            className="appearance-none rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-white/60 outline-none focus:border-accent/30"
          >
            <option value="" className="bg-surface-100">All Platforms</option>
            {LEAD_PLATFORMS.map((p) => (
              <option key={p} value={p} className="bg-surface-100">{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-12 text-center">
          <p className="text-sm text-white/30">
            {searchQuery || statusFilter || platformFilter
              ? 'No leads match your filters'
              : 'No leads yet. Add your first lead above.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
          {/* Header */}
          <div className="hidden border-b border-white/[0.04] bg-white/[0.02] px-4 py-2 sm:grid sm:grid-cols-[1fr_90px_100px_32px] sm:gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">Name / Company</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">Platform</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">Status</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.03]">
            {leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] sm:grid sm:grid-cols-[1fr_90px_100px_32px] sm:items-center sm:gap-3"
              >
                {/* Name / Company */}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white/80">{lead.name}</div>
                  <div className="truncate text-xs text-white/30">{lead.companyName}</div>
                </div>

                {/* Platform */}
                <div>
                  <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-medium', platformBadge[lead.platform])}>
                    {lead.platform}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                  <div className={cn('h-1.5 w-1.5 rounded-full', statusDot[lead.status])} />
                  <span className="text-xs text-white/50">{lead.status}</span>
                </div>

                {/* Profile link */}
                <div>
                  {lead.profileUrl && (
                    <a
                      href={lead.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-white/20 hover:text-white/50"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-right text-[10px] text-white/20">
        {leads.length} lead{leads.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

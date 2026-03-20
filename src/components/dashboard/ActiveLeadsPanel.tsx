import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, X, Search } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { EmailNotification } from '../../types/notifications';
import {
  SectionHeader, PlatformBadge, CategoryBadge, LeadTypeBadge,
  FilterChip, EmptyState, timeAgo,
} from './ui';

interface ActiveLeadsPanelProps {
  leads: EmailNotification[];
  loading: boolean;
  onDismiss: (id: string) => void;
}

// ── Grouping / sorting ──────────────────────────────────────

type LeadTier = 'warm' | 'active' | 'generic';

const WARM_CATEGORIES = new Set(['interview', 'assessment', 'interview_invite']);
const ACTIVE_CATEGORIES = new Set([
  'recruiter_response', 'inmail_message', 'recruiter_follow_up',
]);

function tierOf(n: EmailNotification): LeadTier {
  if (WARM_CATEGORIES.has(n.category)) return 'warm';
  if (ACTIVE_CATEGORIES.has(n.category)) return 'active';
  return 'generic';
}

const TIER_ORDER: Record<LeadTier, number> = { warm: 0, active: 1, generic: 2 };
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortLeads(leads: EmailNotification[]): EmailNotification[] {
  return [...leads].sort((a, b) => {
    const ta = TIER_ORDER[tierOf(a)];
    const tb = TIER_ORDER[tierOf(b)];
    if (ta !== tb) return ta - tb;
    const pa = PRIORITY_ORDER[a.priority] ?? 2;
    const pb = PRIORITY_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });
}

const TIER_LABELS: Record<LeadTier, string> = {
  warm: 'Warm / High Intent',
  active: 'Active Recruiter Conversations',
  generic: 'Opportunistic / Generic',
};
const TIER_COLORS: Record<LeadTier, string> = {
  warm: 'text-violet-400/60',
  active: 'text-emerald-400/60',
  generic: 'text-white/20',
};

// ── Lead type from metadata ─────────────────────────────────

function getLeadType(n: EmailNotification): string | null {
  const meta = (n as unknown as { metadata?: Record<string, unknown> }).metadata;
  if (meta?.lead_type && typeof meta.lead_type === 'string') return meta.lead_type;

  // Infer from category/body heuristics
  const combined = `${n.subject ?? ''} ${n.snippet ?? ''}`.toLowerCase();
  if (/founder|co-?founder/.test(combined)) return 'founder';
  if (/staffing|recruiting agency|we partner/.test(combined)) return 'staffing_agency';
  if (/hiring manager|head of|team lead/.test(combined)) return 'hiring_manager';
  if (/recruiter|talent acquisition/.test(combined)) return 'recruiter';
  return null;
}

function getRoleTitle(n: EmailNotification): string | null {
  const meta = (n as unknown as { metadata?: Record<string, unknown> }).metadata;
  return (meta?.role_title as string) ?? null;
}

// ── Lead card ───────────────────────────────────────────────

function LeadCard({
  lead,
  onDismiss,
}: {
  lead: EmailNotification;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const leadType = getLeadType(lead);
  const roleTitle = getRoleTitle(lead);
  const tier = tierOf(lead);

  const borderClass =
    tier === 'warm'
      ? 'border-l-violet-400/60'
      : tier === 'active'
        ? 'border-l-emerald-400/40'
        : 'border-l-white/[0.06]';

  return (
    <div
      className={`group rounded-lg border border-l-2 border-white/[0.05] bg-white/[0.015] transition-colors hover:bg-white/[0.03] ${borderClass}`}
    >
      <div
        className="flex cursor-pointer items-start gap-3 px-3 py-2.5"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Identity block */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {lead.contactName && (
              <span className="text-xs font-semibold text-white/85">{lead.contactName}</span>
            )}
            {lead.companyName && (
              <span className="text-[11px] text-white/40">
                {lead.contactName ? `@ ${lead.companyName}` : lead.companyName}
              </span>
            )}
          </div>

          {roleTitle && (
            <p className="mt-0.5 truncate text-[11px] text-white/30">{roleTitle}</p>
          )}

          {/* Badges row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <PlatformBadge platform={lead.platform} />
            <CategoryBadge category={lead.category} />
            <LeadTypeBadge type={leadType} />
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="text-[10px] tabular-nums text-white/15">
            {timeAgo(lead.receivedAt)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="rounded p-1 text-white/0 transition-colors group-hover:text-white/20 hover:!bg-white/[0.06] hover:!text-white/50"
            title="Remove"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white/[0.04] px-3 py-2.5 text-[11px] text-white/30">
          {lead.subject && <p className="mb-1.5 text-white/35">{lead.subject}</p>}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {lead.senderEmail && (
              <div><span className="text-white/15">Email:</span> {lead.senderEmail}</div>
            )}
            {lead.contactName && (
              <div><span className="text-white/15">Contact:</span> {lead.contactName}</div>
            )}
            <div><span className="text-white/15">Received:</span> {new Date(lead.receivedAt).toLocaleString()}</div>
          </div>
          {lead.snippet && (
            <p className="mt-2 text-white/20 italic">{lead.snippet}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export function ActiveLeadsPanel({ leads, loading, onDismiss }: ActiveLeadsPanelProps) {
  const reduced = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<LeadTier | 'all'>('all');

  const sorted = useMemo(() => sortLeads(leads), [leads]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (filterTier !== 'all') {
      list = list.filter((l) => tierOf(l) === filterTier);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.companyName?.toLowerCase().includes(q) ||
          l.contactName?.toLowerCase().includes(q) ||
          l.subject?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [sorted, filterTier, searchQuery]);

  // Group by tier for visual sections
  const grouped = useMemo(() => {
    const groups: Record<LeadTier, EmailNotification[]> = { warm: [], active: [], generic: [] };
    for (const lead of filtered) {
      groups[tierOf(lead)].push(lead);
    }
    return groups;
  }, [filtered]);

  // Tier counts
  const tierCounts = useMemo(() => ({
    all: sorted.length,
    warm: sorted.filter((l) => tierOf(l) === 'warm').length,
    active: sorted.filter((l) => tierOf(l) === 'active').length,
    generic: sorted.filter((l) => tierOf(l) === 'generic').length,
  }), [sorted]);

  return (
    <section className="relative scroll-mt-20 py-10">
      <SectionHeader
        id="active-leads"
        title="Active Leads"
        subtitle={`${leads.length} inbound signals from recruiters and hiring contacts`}
      />

      {leads.length > 0 ? (
        <>
          {/* Filter bar */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {([
              ['all', 'All'],
              ['warm', 'Warm / High Intent'],
              ['active', 'Recruiter Conversations'],
              ['generic', 'Opportunistic'],
            ] as [LeadTier | 'all', string][]).map(([key, label]) => (
              <FilterChip
                key={key}
                label={label}
                active={filterTier === key}
                count={tierCounts[key]}
                onClick={() => setFilterTier(key)}
              />
            ))}
          </div>

          {/* Search */}
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
            <Search size={12} className="text-white/15" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white/60 placeholder:text-white/15 outline-none"
            />
          </div>

          {/* Grouped lead cards */}
          {filterTier === 'all' ? (
            // Show with tier headers
            (['warm', 'active', 'generic'] as LeadTier[]).map((tier) =>
              grouped[tier].length > 0 ? (
                <div key={tier} className="mb-4">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${TIER_COLORS[tier]}`}>
                      {TIER_LABELS[tier]}
                    </span>
                    <span className="text-[9px] text-white/10">({grouped[tier].length})</span>
                  </div>
                  <div className="space-y-1">
                    {grouped[tier].map((lead, i) => (
                      <motion.div
                        key={lead.id}
                        initial={reduced ? undefined : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      >
                        <LeadCard lead={lead} onDismiss={() => onDismiss(lead.id)} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : null,
            )
          ) : (
            // Flat list for single-tier filter
            <div className="space-y-1">
              {filtered.map((lead, i) => (
                <motion.div
                  key={lead.id}
                  initial={reduced ? undefined : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                >
                  <LeadCard lead={lead} onDismiss={() => onDismiss(lead.id)} />
                </motion.div>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-white/20">No leads match current filters</p>
          )}
        </>
      ) : loading ? (
        <p className="py-8 text-center text-xs text-white/15">Loading...</p>
      ) : (
        <EmptyState
          icon={<UserCheck size={20} />}
          title="No active leads yet"
          subtitle="Recruiter responses and hiring signals will appear here"
        />
      )}
    </section>
  );
}

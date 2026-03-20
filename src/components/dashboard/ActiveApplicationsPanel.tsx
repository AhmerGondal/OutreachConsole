import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Search, ChevronDown } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { ApplicationStore } from '../../hooks/useApplicationStore';
import type { ApplicationStatus, TrackedApplication } from '../../types/notifications';
import {
  SectionHeader, PlatformBadge, StatusBadge,
  FilterChip, EmptyState, shortDate,
} from './ui';

// ── Sorting ─────────────────────────────────────────────────

const STATUS_SORT_ORDER: Record<string, number> = {
  interviewing: 0,
  assessment: 1,
  responded: 2,
  active: 3,
  in_review: 4,
  unknown: 5,
  rejected: 6,
  archived: 7,
};

function sortApps(apps: TrackedApplication[]): TrackedApplication[] {
  return [...apps].sort((a, b) => {
    const sa = STATUS_SORT_ORDER[a.applicationStatus] ?? 5;
    const sb = STATUS_SORT_ORDER[b.applicationStatus] ?? 5;
    if (sa !== sb) return sa - sb;
    // Within same status, most recently updated first
    const da = a.latestEmailAt || a.updatedAt;
    const db = b.latestEmailAt || b.updatedAt;
    return new Date(db).getTime() - new Date(da).getTime();
  });
}

// ── Status filters ──────────────────────────────────────────

const STATUS_FILTERS: Array<{ label: string; value: ApplicationStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'Responded', value: 'responded' },
  { label: 'Interviewing', value: 'interviewing' },
  { label: 'Rejected', value: 'rejected' },
];

const PLATFORM_OPTIONS = [
  { value: undefined as string | undefined, label: 'All' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'wellfound', label: 'Wellfound' },
  { value: 'mercor', label: 'Mercor' },
  { value: 'direct_email', label: 'Direct' },
];

// ── Stage dots ──────────────────────────────────────────────

const STAGE_ORDER: ApplicationStatus[] = ['active', 'responded', 'interviewing'];

function StageDots({ status }: { status: ApplicationStatus }) {
  const idx = STAGE_ORDER.indexOf(status);
  const isRejected = status === 'rejected';

  return (
    <div className="flex items-center gap-0.5">
      {STAGE_ORDER.map((stage, i) => {
        const reached = !isRejected && idx >= i;
        return (
          <div
            key={stage}
            className={`h-1 w-3 rounded-full ${
              isRejected
                ? 'bg-rose-400/20'
                : reached
                  ? i === 0
                    ? 'bg-blue-400'
                    : i === 1
                      ? 'bg-emerald-400'
                      : 'bg-violet-400'
                  : 'bg-white/[0.06]'
            }`}
          />
        );
      })}
    </div>
  );
}

// ── Application row ─────────────────────────────────────────

function AppRow({ app }: { app: TrackedApplication }) {
  const [expanded, setExpanded] = useState(false);
  const isRejected = app.applicationStatus === 'rejected';

  return (
    <div
      className={`group rounded-lg border border-white/[0.04] bg-white/[0.015] transition-colors hover:bg-white/[0.03] ${
        isRejected ? 'opacity-50' : ''
      }`}
    >
      <div
        className="flex cursor-pointer items-center gap-3 px-3 py-2"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Platform */}
        <div className="w-16 flex-shrink-0">
          <PlatformBadge platform={app.platform} />
        </div>

        {/* Company / Role */}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-white/75">
            {app.companyName || 'Unknown'}
          </span>
          {app.roleTitle && (
            <span className="block truncate text-[10px] text-white/25">
              {app.roleTitle}
            </span>
          )}
        </div>

        {/* Stage progression */}
        <div className="hidden flex-shrink-0 sm:block">
          <StageDots status={app.applicationStatus} />
        </div>

        {/* Applied date */}
        <span className="hidden w-16 flex-shrink-0 text-right text-[10px] tabular-nums text-white/20 sm:block">
          {shortDate(app.appliedAt || app.firstDetectedAt)}
        </span>

        {/* Latest activity */}
        <span className="w-16 flex-shrink-0 text-right text-[10px] tabular-nums text-white/20">
          {shortDate(app.latestEmailAt)}
        </span>

        {/* Status badge */}
        <div className="w-24 flex-shrink-0 text-right">
          <StatusBadge status={app.applicationStatus} />
        </div>

        {/* Expand indicator */}
        <ChevronDown
          size={12}
          className={`flex-shrink-0 text-white/10 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white/[0.04] px-3 py-2.5 text-[11px] text-white/30">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            <div>
              <span className="text-white/15">Company:</span> {app.companyName || '—'}
            </div>
            {app.roleTitle && (
              <div>
                <span className="text-white/15">Role:</span> {app.roleTitle}
              </div>
            )}
            <div>
              <span className="text-white/15">Platform:</span> {app.platform}
            </div>
            <div>
              <span className="text-white/15">Applied:</span> {shortDate(app.appliedAt || app.firstDetectedAt)}
            </div>
            <div>
              <span className="text-white/15">Last Update:</span> {shortDate(app.latestEmailAt || app.updatedAt)}
            </div>
            <div>
              <span className="text-white/15">Status:</span> {app.applicationStatus}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

interface ActiveApplicationsPanelProps {
  store: ApplicationStore;
}

export function ActiveApplicationsPanel({ store }: ActiveApplicationsPanelProps) {
  const reduced = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string | undefined>();
  const [showAll, setShowAll] = useState(false);

  // Status counts for filter chips
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const app of store.applications) {
      counts[app.applicationStatus] = (counts[app.applicationStatus] ?? 0) + 1;
    }
    return counts;
  }, [store.applications]);

  // Full filter + sort pipeline
  const filtered = useMemo(() => {
    let list = store.applications;

    if (store.statusFilter) {
      list = list.filter((a) => a.applicationStatus === store.statusFilter);
    }
    if (platformFilter) {
      list = list.filter((a) => a.platform === platformFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.companyName?.toLowerCase().includes(q) ||
          a.roleTitle?.toLowerCase().includes(q),
      );
    }

    return sortApps(list);
  }, [store.applications, store.statusFilter, platformFilter, searchQuery]);

  const displayLimit = showAll ? filtered.length : 12;
  const displayed = filtered.slice(0, displayLimit);

  return (
    <section className="relative scroll-mt-20 py-10">
      <SectionHeader
        id="applications"
        title="Applications"
        subtitle={`${store.applications.length} tracked across all platforms`}
      />

      {store.applications.length > 0 ? (
        <>
          {/* Filter row */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <FilterChip
                key={f.label}
                label={f.label}
                active={store.statusFilter === f.value}
                count={f.value ? statusCounts[f.value] : store.applications.length}
                onClick={() => store.setStatusFilter(f.value)}
              />
            ))}

            {/* Platform sub-filters */}
            <div className="ml-auto flex items-center gap-1">
              {PLATFORM_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setPlatformFilter(opt.value)}
                  className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors ${
                    platformFilter === opt.value
                      ? 'bg-white/[0.08] text-white/50'
                      : 'text-white/15 hover:text-white/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
            <Search size={12} className="text-white/15" />
            <input
              type="text"
              placeholder="Search by company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white/60 placeholder:text-white/15 outline-none"
            />
          </div>

          {/* Table header */}
          <div className="mb-1 flex items-center gap-3 px-3 text-[9px] font-semibold uppercase tracking-wider text-white/15">
            <span className="w-16 flex-shrink-0">Source</span>
            <span className="min-w-0 flex-1">Company / Role</span>
            <span className="hidden flex-shrink-0 sm:block" style={{ width: 54 }}>Stage</span>
            <span className="hidden w-16 flex-shrink-0 text-right sm:block">Applied</span>
            <span className="w-16 flex-shrink-0 text-right">Updated</span>
            <span className="w-24 flex-shrink-0 text-right">Status</span>
            <span className="w-3 flex-shrink-0" /> {/* chevron space */}
          </div>

          {/* Application rows */}
          <div className="space-y-0.5">
            {displayed.map((app, i) => (
              <motion.div
                key={app.id}
                initial={reduced ? undefined : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.2) }}
              >
                <AppRow app={app} />
              </motion.div>
            ))}
          </div>

          {/* Show more */}
          {filtered.length > 12 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-2 flex w-full items-center justify-center gap-1 py-2 text-[10px] text-white/20 hover:text-white/40"
            >
              {showAll ? 'Show less' : `Show all ${filtered.length}`}
              <ChevronDown size={10} className={showAll ? 'rotate-180' : ''} />
            </button>
          )}

          {filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-white/20">
              No applications match current filters
            </p>
          )}
        </>
      ) : store.loading ? (
        <p className="py-8 text-center text-xs text-white/15">Loading...</p>
      ) : (
        <EmptyState
          icon={<Briefcase size={20} />}
          title="No applications tracked yet"
          subtitle="Applications detected from email sync will appear here"
        />
      )}
    </section>
  );
}

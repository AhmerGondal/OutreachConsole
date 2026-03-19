import { useState } from 'react';
import { Briefcase, ChevronDown } from 'lucide-react';
import { SectionWrapper } from '../SectionWrapper';
import type { ApplicationStore } from '../../hooks/useApplicationStore';
import type { ApplicationStatus } from '../../types/notifications';
import { APP_STATUS_LABELS } from '../../types/notifications';

interface ActiveApplicationsPanelProps {
  store: ApplicationStore;
}

const STATUS_FILTERS: Array<{ label: string; value: ApplicationStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'Responded', value: 'responded' },
  { label: 'Interviewing', value: 'interviewing' },
  { label: 'Rejected', value: 'rejected' },
];

function statusColor(s: ApplicationStatus): string {
  const colors: Record<ApplicationStatus, string> = {
    active: 'text-blue-400/70',
    responded: 'text-emerald-400/70',
    interviewing: 'text-violet-400/70',
    rejected: 'text-rose-400/50',
    archived: 'text-white/20',
    unknown: 'text-white/20',
  };
  return colors[s] ?? 'text-white/20';
}

function statusDot(s: ApplicationStatus): string {
  const colors: Record<ApplicationStatus, string> = {
    active: 'bg-blue-400',
    responded: 'bg-emerald-400',
    interviewing: 'bg-violet-400',
    rejected: 'bg-rose-400/60',
    archived: 'bg-white/20',
    unknown: 'bg-white/20',
  };
  return colors[s] ?? 'bg-white/20';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function platformBadge(p: string): string {
  if (p === 'linkedin') return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
  if (p === 'wellfound') return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
  return 'bg-white/[0.04] border-white/[0.08] text-white/40';
}

export function ActiveApplicationsPanel({ store }: ActiveApplicationsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const displayLimit = expanded ? store.applications.length : 8;

  return (
    <SectionWrapper
      id="applications"
      title="Applications"
      subtitle={`${store.applications.length} tracked applications`}
    >
      {/* Status filters */}
      <div className="mb-3 flex gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => store.setStatusFilter(f.value)}
            className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
              store.statusFilter === f.value
                ? 'bg-accent/15 text-accent-light'
                : 'text-white/25 hover:bg-white/[0.04] hover:text-white/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {store.applications.length > 0 ? (
        <>
          {/* Header row */}
          <div className="mb-1 grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/15">
            <span className="w-16">Platform</span>
            <span>Company / Role</span>
            <span className="w-20 text-right">Applied</span>
            <span className="w-20 text-right">Latest</span>
            <span className="w-20 text-right">Status</span>
          </div>

          <div className="space-y-1">
            {store.applications.slice(0, displayLimit).map((app) => (
              <div
                key={app.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2 transition-colors hover:bg-white/[0.03]"
              >
                <span className={`w-16 rounded border px-1.5 py-0.5 text-center text-[9px] font-semibold uppercase ${platformBadge(app.platform)}`}>
                  {app.platform}
                </span>

                <div className="min-w-0">
                  <span className="block truncate text-xs text-white/70">
                    {app.companyName || 'Unknown company'}
                  </span>
                  {app.roleTitle && (
                    <span className="block truncate text-[10px] text-white/25">
                      {app.roleTitle}
                    </span>
                  )}
                </div>

                <span className="w-20 text-right text-[10px] tabular-nums text-white/20">
                  {formatDate(app.appliedAt || app.firstDetectedAt)}
                </span>

                <span className="w-20 text-right text-[10px] tabular-nums text-white/20">
                  {formatDate(app.latestEmailAt)}
                </span>

                <div className="flex w-20 items-center justify-end gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot(app.applicationStatus)}`} />
                  <span className={`text-[10px] ${statusColor(app.applicationStatus)}`}>
                    {APP_STATUS_LABELS[app.applicationStatus]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {store.applications.length > 8 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex w-full items-center justify-center gap-1 py-2 text-[10px] text-white/20 hover:text-white/40"
            >
              {expanded ? 'Show less' : `Show all ${store.applications.length}`}
              <ChevronDown size={10} className={expanded ? 'rotate-180' : ''} />
            </button>
          )}
        </>
      ) : store.loading ? (
        <div className="py-8 text-center text-xs text-white/15">Loading...</div>
      ) : (
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] py-8 text-center">
          <Briefcase size={18} className="mx-auto mb-2 text-white/10" />
          <p className="text-xs text-white/20">No applications tracked yet</p>
          <p className="mt-1 text-[10px] text-white/10">
            Applications detected from email will appear here
          </p>
        </div>
      )}
    </SectionWrapper>
  );
}

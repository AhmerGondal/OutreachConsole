/**
 * Shared dashboard UI primitives — badges, empty states, section chrome.
 * Keeps the three main panels visually consistent.
 */
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

// ── Platform badge ──────────────────────────────────────────

const PLATFORM_STYLES: Record<string, string> = {
  linkedin: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  wellfound: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  mercor: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
  direct_email: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
  email: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
};
const PLATFORM_DEFAULT = 'bg-white/[0.04] border-white/[0.08] text-white/40';

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  wellfound: 'Wellfound',
  mercor: 'Mercor',
  direct_email: 'Direct',
  email: 'Email',
  other: 'Other',
};

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none',
        PLATFORM_STYLES[platform] ?? PLATFORM_DEFAULT,
      )}
    >
      {PLATFORM_LABELS[platform] ?? platform}
    </span>
  );
}

// ── Priority indicator ──────────────────────────────────────

export function PriorityDot({ priority }: { priority: string }) {
  const color =
    priority === 'high'
      ? 'bg-rose-400'
      : priority === 'medium'
        ? 'bg-amber-400/70'
        : 'bg-white/20';
  return <span className={cn('inline-block h-1.5 w-1.5 rounded-full', color)} />;
}

// ── Status badge ────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  applied: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  responded: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  in_review: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  interviewing: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  interview: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  assessment: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rejected: 'bg-rose-500/8 text-rose-400/60 border-rose-500/15',
  archived: 'bg-white/[0.03] text-white/25 border-white/[0.06]',
  unknown: 'bg-white/[0.03] text-white/25 border-white/[0.06]',
};
const STATUS_DEFAULT = 'bg-white/[0.04] text-white/30 border-white/[0.06]';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  applied: 'Applied',
  responded: 'Responded',
  in_review: 'In Review',
  interviewing: 'Interviewing',
  interview: 'Interview',
  assessment: 'Assessment',
  rejected: 'Rejected',
  archived: 'Archived',
  unknown: 'Unknown',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium leading-none',
        STATUS_STYLES[status] ?? STATUS_DEFAULT,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'active' || status === 'applied' ? 'bg-blue-400' :
          status === 'responded' ? 'bg-emerald-400' :
          status === 'in_review' ? 'bg-sky-400' :
          status === 'interviewing' || status === 'interview' ? 'bg-violet-400' :
          status === 'assessment' ? 'bg-amber-400' :
          status === 'rejected' ? 'bg-rose-400/60' :
          'bg-white/20',
        )}
      />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Category badge ──────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  interview: 'bg-violet-500/10 text-violet-400',
  assessment: 'bg-amber-500/10 text-amber-400',
  recruiter_response: 'bg-emerald-500/10 text-emerald-400',
  inmail_message: 'bg-blue-500/10 text-blue-400',
  job_opportunity: 'bg-sky-500/10 text-sky-400',
  general_employment_interest: 'bg-teal-500/10 text-teal-400',
  rejection: 'bg-rose-500/8 text-rose-400/60',
  application_update: 'bg-white/[0.04] text-white/40',
  application_confirmation: 'bg-white/[0.03] text-white/25',
};
const CATEGORY_DEFAULT = 'bg-white/[0.03] text-white/25';

const CATEGORY_SHORT_LABELS: Record<string, string> = {
  interview: 'Interview',
  assessment: 'Assessment',
  recruiter_response: 'Recruiter',
  inmail_message: 'Message',
  job_opportunity: 'Opportunity',
  general_employment_interest: 'Interest',
  rejection: 'Rejection',
  application_update: 'Update',
  application_confirmation: 'Applied',
  recruiter_follow_up: 'Follow-Up',
  interview_invite: 'Interview',
};

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none',
        CATEGORY_STYLES[category] ?? CATEGORY_DEFAULT,
      )}
    >
      {CATEGORY_SHORT_LABELS[category] ?? category.replace(/_/g, ' ')}
    </span>
  );
}

// ── Lead type badge ─────────────────────────────────────────

const LEAD_TYPE_LABELS: Record<string, string> = {
  founder: 'Founder',
  hiring_manager: 'Hiring Mgr',
  recruiter: 'Recruiter',
  staffing_agency: 'Staffing',
  platform_system: 'System',
};

const LEAD_TYPE_STYLES: Record<string, string> = {
  founder: 'text-violet-400',
  hiring_manager: 'text-emerald-400',
  recruiter: 'text-blue-400',
  staffing_agency: 'text-amber-400',
};

export function LeadTypeBadge({ type }: { type: string | null | undefined }) {
  if (!type || type === 'unknown' || type === 'platform_system') return null;
  return (
    <span className={cn('text-[9px] font-medium uppercase', LEAD_TYPE_STYLES[type] ?? 'text-white/30')}>
      {LEAD_TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ── Empty state ─────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] py-10 text-center">
      <div className="mx-auto mb-2.5 text-white/10">{icon}</div>
      <p className="text-xs font-medium text-white/25">{title}</p>
      {subtitle && <p className="mt-1 text-[10px] text-white/10">{subtitle}</p>}
    </div>
  );
}

// ── Filter chip bar ─────────────────────────────────────────

export function FilterChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors',
        active
          ? 'bg-accent/15 text-accent-light'
          : 'text-white/25 hover:bg-white/[0.04] hover:text-white/40',
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          'rounded-full px-1.5 text-[9px] tabular-nums',
          active ? 'bg-accent/20 text-accent-light' : 'bg-white/[0.06] text-white/30',
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Section header (compact) ────────────────────────────────

export function SectionHeader({
  id,
  title,
  subtitle,
  trailing,
}: {
  id: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-20 mb-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-white/30">{subtitle}</p>}
        </div>
        {trailing && <div className="flex-shrink-0">{trailing}</div>}
      </div>
      <div className="mt-2.5 h-px w-12 bg-gradient-to-r from-accent to-transparent" />
    </div>
  );
}

// ── Time formatting ─────────────────────────────────────────

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function shortDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

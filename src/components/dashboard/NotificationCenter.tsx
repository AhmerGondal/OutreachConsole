import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, X, AlertCircle, Mail, Search,
  Zap, ShieldAlert,
} from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { NotificationStore } from '../../hooks/useNotificationStore';
import type { EmailNotification } from '../../types/notifications';
import {
  SectionHeader, PlatformBadge, CategoryBadge, PriorityDot,
  FilterChip, EmptyState, timeAgo,
} from './ui';

// ── Filters ─────────────────────────────────────────────────

type QuickFilter =
  | 'all'
  | 'action'
  | 'human'
  | 'interview'
  | 'rejection'
  | 'application';

const HUMAN_CATEGORIES = new Set<string>([
  'recruiter_response', 'inmail_message', 'job_opportunity',
  'general_employment_interest', 'recruiter_follow_up',
]);
const INTERVIEW_CATEGORIES = new Set<string>([
  'interview', 'assessment', 'interview_invite',
]);
const REJECTION_CATEGORIES = new Set<string>(['rejection']);
const APP_CATEGORIES = new Set<string>([
  'application_update', 'application_confirmation',
]);

type PlatformFilter = string | undefined;

const PLATFORM_OPTIONS = [
  { value: undefined as PlatformFilter, label: 'All' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'wellfound', label: 'Wellfound' },
  { value: 'mercor', label: 'Mercor' },
  { value: 'direct_email', label: 'Direct' },
];

function matchesFilter(n: EmailNotification, filter: QuickFilter): boolean {
  switch (filter) {
    case 'action': return n.actionRequired;
    case 'human': return HUMAN_CATEGORIES.has(n.category);
    case 'interview': return INTERVIEW_CATEGORIES.has(n.category);
    case 'rejection': return REJECTION_CATEGORIES.has(n.category);
    case 'application': return APP_CATEGORIES.has(n.category);
    default: return true;
  }
}

// ── Summary strip ───────────────────────────────────────────

function SummaryStrip({ notifications }: { notifications: EmailNotification[] }) {
  const counts = useMemo(() => {
    let action = 0, high = 0, interviews = 0, rejections = 0, today = 0;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    for (const n of notifications) {
      if (n.actionRequired) action++;
      if (n.priority === 'high') high++;
      if (INTERVIEW_CATEGORIES.has(n.category)) interviews++;
      if (n.category === 'rejection') rejections++;
      if (now - new Date(n.receivedAt).getTime() < dayMs) today++;
    }
    return { action, high, interviews, rejections, today };
  }, [notifications]);

  const items = [
    { label: 'Needs Action', value: counts.action, color: 'text-rose-400' },
    { label: 'High Priority', value: counts.high, color: 'text-amber-400' },
    { label: 'Interviews', value: counts.interviews, color: 'text-violet-400' },
    { label: 'Rejections', value: counts.rejections, color: 'text-rose-400/50' },
    { label: 'New Today', value: counts.today, color: 'text-accent-light' },
  ];

  return (
    <div className="mb-4 flex gap-4 overflow-x-auto rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/20">{item.label}</span>
          <span className={`text-sm font-semibold tabular-nums ${item.value > 0 ? item.color : 'text-white/15'}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Notification row ────────────────────────────────────────

function NotifRow({
  notif,
  onRead,
  onDismiss,
}: {
  notif: EmailNotification;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isUnread = notif.status === 'unread';

  // Parse metadata from snippet/subject for role_title
  const meta = (notif as unknown as { metadata?: Record<string, unknown> }).metadata;
  const roleTitle = meta?.role_title as string | undefined;

  const borderClass =
    notif.priority === 'high'
      ? 'border-l-rose-400/80'
      : notif.priority === 'medium'
        ? 'border-l-amber-400/50'
        : 'border-l-white/[0.06]';

  return (
    <div
      className={`group rounded-lg border border-l-2 border-white/[0.05] bg-white/[0.015] transition-colors hover:bg-white/[0.03] ${borderClass} ${
        isUnread ? '' : 'opacity-55'
      }`}
    >
      <div
        className="flex cursor-pointer items-start gap-3 px-3 py-2.5"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icon */}
        <div className="mt-0.5 flex-shrink-0">
          {INTERVIEW_CATEGORIES.has(notif.category) ? (
            <Zap size={13} className="text-violet-400" />
          ) : notif.actionRequired ? (
            <AlertCircle size={13} className="text-rose-400" />
          ) : notif.category === 'rejection' ? (
            <ShieldAlert size={13} className="text-rose-400/40" />
          ) : (
            <Mail size={13} className="text-white/20" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Top line: company + summary */}
          <div className="flex items-center gap-2">
            {notif.companyName && (
              <span className="flex-shrink-0 text-xs font-semibold text-white/85">
                {notif.companyName}
              </span>
            )}
            {roleTitle && (
              <span className="truncate text-[11px] text-white/35">
                {roleTitle}
              </span>
            )}
          </div>

          {/* Subject / snippet */}
          <p className="mt-0.5 truncate text-[11px] text-white/45">
            {notif.subject || notif.snippet || 'No subject'}
          </p>

          {/* Meta badges */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <PlatformBadge platform={notif.platform} />
            <CategoryBadge category={notif.category} />
            {notif.actionRequired && (
              <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-rose-400">
                Action
              </span>
            )}
            <PriorityDot priority={notif.priority} />
          </div>
        </div>

        {/* Right: time + actions */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="text-[10px] tabular-nums text-white/15">
            {timeAgo(notif.receivedAt)}
          </span>
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {isUnread && (
              <button
                onClick={(e) => { e.stopPropagation(); onRead(); }}
                className="rounded p-1 text-white/20 hover:bg-white/[0.06] hover:text-white/50"
                title="Mark read"
              >
                <CheckCheck size={11} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="rounded p-1 text-white/20 hover:bg-white/[0.06] hover:text-white/50"
              title="Dismiss"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04] px-3 py-2.5 text-[11px] text-white/30">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {notif.contactName && (
                  <div><span className="text-white/15">Contact:</span> {notif.contactName}</div>
                )}
                {notif.senderEmail && (
                  <div><span className="text-white/15">Email:</span> {notif.senderEmail}</div>
                )}
                {roleTitle && (
                  <div><span className="text-white/15">Role:</span> {roleTitle}</div>
                )}
                <div><span className="text-white/15">Received:</span> {new Date(notif.receivedAt).toLocaleString()}</div>
              </div>
              {notif.snippet && notif.snippet !== notif.subject && (
                <p className="mt-2 text-white/20">{notif.snippet}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

interface NotificationCenterProps {
  store: NotificationStore;
}

export function NotificationCenter({ store }: NotificationCenterProps) {
  const reduced = useReducedMotion();
  const { summary, notifications } = store;

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter pipeline
  const filtered = useMemo(() => {
    let list = notifications.filter((n) => n.status !== 'dismissed');

    if (quickFilter !== 'all') {
      list = list.filter((n) => matchesFilter(n, quickFilter));
    }
    if (platformFilter) {
      list = list.filter((n) => n.platform === platformFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.companyName?.toLowerCase().includes(q) ||
          n.subject?.toLowerCase().includes(q) ||
          n.contactName?.toLowerCase().includes(q),
      );
    }

    // Sort: action_required first, then priority desc, then newest
    const priOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    list.sort((a, b) => {
      if (a.actionRequired !== b.actionRequired) return a.actionRequired ? -1 : 1;
      const pa = priOrder[a.priority] ?? 0;
      const pb = priOrder[b.priority] ?? 0;
      if (pa !== pb) return pb - pa;
      return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    });

    return list;
  }, [notifications, quickFilter, platformFilter, searchQuery]);

  // Counts for filter chips
  const filterCounts = useMemo(() => {
    const active = notifications.filter((n) => n.status !== 'dismissed');
    return {
      all: active.length,
      action: active.filter((n) => n.actionRequired).length,
      human: active.filter((n) => HUMAN_CATEGORIES.has(n.category)).length,
      interview: active.filter((n) => INTERVIEW_CATEGORIES.has(n.category)).length,
      rejection: active.filter((n) => n.category === 'rejection').length,
      application: active.filter((n) => APP_CATEGORIES.has(n.category)).length,
    };
  }, [notifications]);

  return (
    <section className="relative scroll-mt-20 py-10">
      <SectionHeader
        id="notifications"
        title="Mission Control"
        subtitle={
          summary.totalUnread > 0
            ? `${summary.totalUnread} unread · ${summary.actionRequired} need action`
            : 'All clear'
        }
        trailing={
          summary.totalUnread > 0 ? (
            <button
              onClick={store.markAllRead}
              className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/40"
            >
              <CheckCheck size={11} />
              Mark all read
            </button>
          ) : undefined
        }
      />

      {notifications.length > 0 ? (
        <>
          {/* Summary strip */}
          <SummaryStrip notifications={notifications.filter((n) => n.status !== 'dismissed')} />

          {/* Filters row */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {/* Quick filters */}
            {([
              ['all', 'All'],
              ['action', 'Action Required'],
              ['human', 'Recruiter / Human'],
              ['interview', 'Interview / Assessment'],
              ['rejection', 'Rejections'],
              ['application', 'Applications'],
            ] as [QuickFilter, string][]).map(([key, label]) => (
              <FilterChip
                key={key}
                label={label}
                active={quickFilter === key}
                count={filterCounts[key]}
                onClick={() => setQuickFilter(key)}
              />
            ))}

            {/* Platform filter */}
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
              placeholder="Search notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white/60 placeholder:text-white/15 outline-none"
            />
          </div>

          {/* Notification list */}
          <div className="space-y-1">
            {filtered.map((n, i) => (
              <motion.div
                key={n.id}
                initial={reduced ? undefined : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <NotifRow
                  notif={n}
                  onRead={() => store.markRead(n.id)}
                  onDismiss={() => store.dismiss(n.id)}
                />
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-white/20">
              No notices match current filters
            </p>
          )}
        </>
      ) : store.loading ? (
        <p className="py-8 text-center text-xs text-white/15">Loading...</p>
      ) : (
        <EmptyState
          icon={<Bell size={20} />}
          title="No notifications yet"
          subtitle="Set up the sync agent to start scanning your inbox"
        />
      )}
    </section>
  );
}

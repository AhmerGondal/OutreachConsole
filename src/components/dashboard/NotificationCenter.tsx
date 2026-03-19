import { motion } from 'framer-motion';
import { Bell, CheckCheck, X, AlertCircle, Mail } from 'lucide-react';
import { SectionWrapper } from '../SectionWrapper';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { NotificationStore } from '../../hooks/useNotificationStore';
import type { EmailNotification } from '../../types/notifications';
import { CATEGORY_LABELS } from '../../types/notifications';

interface NotificationCenterProps {
  store: NotificationStore;
}

function platformColor(p: string): string {
  if (p === 'linkedin') return 'text-blue-400';
  if (p === 'wellfound') return 'text-orange-400';
  return 'text-white/40';
}

function platformBg(p: string): string {
  if (p === 'linkedin') return 'bg-blue-500/10 border-blue-500/20';
  if (p === 'wellfound') return 'bg-orange-500/10 border-orange-500/20';
  return 'bg-white/[0.04] border-white/[0.08]';
}

function priorityIndicator(p: string): string {
  if (p === 'high') return 'border-l-rose-400';
  if (p === 'medium') return 'border-l-amber-400/60';
  return 'border-l-white/10';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotifCard({
  notif,
  onRead,
  onDismiss,
}: {
  notif: EmailNotification;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const isUnread = notif.status === 'unread';

  return (
    <div
      className={`group relative rounded-lg border border-l-2 border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.04] ${priorityIndicator(notif.priority)} ${isUnread ? 'border-l-2' : 'border-l border-l-transparent opacity-60'}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex-shrink-0">
          {notif.actionRequired ? (
            <AlertCircle size={13} className="text-rose-400" />
          ) : (
            <Mail size={13} className="text-white/25" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${platformBg(notif.platform)} ${platformColor(notif.platform)}`}>
              {notif.platform}
            </span>
            <span className="text-[10px] text-white/25">
              {CATEGORY_LABELS[notif.category]}
            </span>
            {notif.actionRequired && (
              <span className="rounded bg-rose-500/15 px-1 py-0.5 text-[8px] font-bold uppercase text-rose-400">
                Action
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-xs text-white/70">
            {notif.companyName && (
              <span className="font-medium text-white/90">{notif.companyName} — </span>
            )}
            {notif.subject || notif.snippet || 'No subject'}
          </p>

          <div className="mt-1 flex items-center gap-2">
            {notif.contactName && (
              <span className="text-[10px] text-white/30">{notif.contactName}</span>
            )}
            <span className="text-[10px] text-white/20">{timeAgo(notif.receivedAt)}</span>
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {isUnread && (
            <button
              onClick={onRead}
              className="rounded p-1 text-white/20 hover:bg-white/[0.06] hover:text-white/50"
              title="Mark read"
            >
              <CheckCheck size={12} />
            </button>
          )}
          <button
            onClick={onDismiss}
            className="rounded p-1 text-white/20 hover:bg-white/[0.06] hover:text-white/50"
            title="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter({ store }: NotificationCenterProps) {
  const reduced = useReducedMotion();
  const { summary, notifications } = store;

  const actionItems = notifications.filter((n) => n.actionRequired && n.status !== 'dismissed');
  const infoItems = notifications.filter((n) => !n.actionRequired && n.status !== 'dismissed');

  return (
    <SectionWrapper
      id="notifications"
      title="Notices"
      subtitle={
        summary.totalUnread > 0
          ? `${summary.totalUnread} unread${summary.actionRequired > 0 ? ` · ${summary.actionRequired} action required` : ''}`
          : 'All caught up'
      }
    >
      {/* Summary bar */}
      {summary.totalUnread > 0 && (
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3"
        >
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <Bell size={13} className="text-accent-light" />
            <span className="text-xs text-white/50">
              {summary.totalUnread} new
            </span>
            {Object.entries(summary.byPlatform).map(([platform, count]) => (
              <span key={platform} className={`text-[10px] ${platformColor(platform)}`}>
                {count} {platform}
              </span>
            ))}
          </div>
          <button
            onClick={store.markAllRead}
            className="text-[10px] text-white/20 hover:text-white/50"
          >
            Mark all read
          </button>
        </motion.div>
      )}

      {/* Action Required */}
      {actionItems.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5">
            <AlertCircle size={11} className="text-rose-400/60" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
              Action Required ({actionItems.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {actionItems.map((n) => (
              <NotifCard
                key={n.id}
                notif={n}
                onRead={() => store.markRead(n.id)}
                onDismiss={() => store.dismiss(n.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Informational */}
      {infoItems.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
              Informational ({infoItems.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {infoItems.slice(0, 10).map((n) => (
              <NotifCard
                key={n.id}
                notif={n}
                onRead={() => store.markRead(n.id)}
                onDismiss={() => store.dismiss(n.id)}
              />
            ))}
            {infoItems.length > 10 && (
              <p className="pt-1 text-center text-[10px] text-white/20">
                +{infoItems.length - 10} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {notifications.length === 0 && !store.loading && (
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] py-10 text-center">
          <Bell size={20} className="mx-auto mb-2 text-white/10" />
          <p className="text-xs text-white/20">No notifications yet</p>
          <p className="mt-1 text-[10px] text-white/10">
            Set up the sync agent to start scanning your inbox
          </p>
        </div>
      )}
    </SectionWrapper>
  );
}

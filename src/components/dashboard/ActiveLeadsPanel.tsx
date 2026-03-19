import { motion } from 'framer-motion';
import { UserCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { SectionWrapper } from '../SectionWrapper';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { EmailNotification } from '../../types/notifications';
import { CATEGORY_LABELS } from '../../types/notifications';

interface ActiveLeadsPanelProps {
  leads: EmailNotification[];
  loading: boolean;
}

function platformBadge(p: string) {
  const colors: Record<string, string> = {
    linkedin: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    wellfound: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  };
  return colors[p] ?? 'bg-white/[0.04] border-white/[0.08] text-white/40';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function ActiveLeadsPanel({ leads, loading }: ActiveLeadsPanelProps) {
  const reduced = useReducedMotion();

  return (
    <SectionWrapper
      id="active-leads"
      title="Active Leads"
      subtitle="Recruiter responses, follow-ups, and interview invites from email"
    >
      {leads.length > 0 ? (
        <div className="space-y-1.5">
          {leads.map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={reduced ? undefined : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="group flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
            >
              {/* Platform badge */}
              <span className={`flex-shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${platformBadge(lead.platform)}`}>
                {lead.platform}
              </span>

              {/* Main info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {lead.companyName && (
                    <span className="text-xs font-medium text-white/80">{lead.companyName}</span>
                  )}
                  {lead.contactName && (
                    <span className="text-[10px] text-white/30">· {lead.contactName}</span>
                  )}
                </div>
                <p className="truncate text-[11px] text-white/40">
                  {lead.subject || CATEGORY_LABELS[lead.category]}
                </p>
              </div>

              {/* Category tag */}
              <span className="flex-shrink-0 text-[9px] text-white/20">
                {CATEGORY_LABELS[lead.category]}
              </span>

              {/* Action badge */}
              {lead.actionRequired && (
                <AlertCircle size={12} className="flex-shrink-0 text-rose-400/60" />
              )}

              {/* Time */}
              <span className="flex-shrink-0 text-[10px] tabular-nums text-white/15">
                {timeAgo(lead.receivedAt)}
              </span>
            </motion.div>
          ))}
        </div>
      ) : loading ? (
        <div className="py-8 text-center text-xs text-white/15">Loading...</div>
      ) : (
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] py-8 text-center">
          <UserCheck size={18} className="mx-auto mb-2 text-white/10" />
          <p className="text-xs text-white/20">No active leads yet</p>
          <p className="mt-1 text-[10px] text-white/10">
            Recruiter responses will appear here
          </p>
        </div>
      )}
    </SectionWrapper>
  );
}

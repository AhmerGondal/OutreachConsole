import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gauge, Plus, LogOut, MessageSquare, CalendarCheck,
  Bell, AlertCircle, Briefcase,
} from 'lucide-react';
import { countByStatus } from '../../lib/leadTracker';
import { DailyOutreachCounter } from './DailyOutreachCounter';
import { QuickAddLead } from './QuickAddLead';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAuth } from '../../hooks/useAuth';
import type { LeadStore } from '../../hooks/useLeadStore';
import type { NotificationSummary } from '../../types/notifications';

interface CommandCenterProps {
  store: LeadStore;
  notifSummary: NotificationSummary;
}

export function CommandCenter({ store, notifSummary }: CommandCenterProps) {
  const reduced = useReducedMotion();
  const { user, signOut } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  const meetingsBooked = countByStatus(store.leads, 'Meeting Booked');

  const kpis = [
    {
      icon: <Bell size={13} />,
      iconColor: 'text-accent-light/60',
      label: 'Notices',
      value: notifSummary.totalUnread,
      href: '#notifications',
      alert: notifSummary.actionRequired > 0 ? notifSummary.actionRequired : undefined,
    },
    {
      icon: <MessageSquare size={13} />,
      iconColor: 'text-emerald-400/60',
      label: 'Responses',
      value: store.responseCount,
    },
    {
      icon: <CalendarCheck size={13} />,
      iconColor: 'text-violet-400/60',
      label: 'Meetings',
      value: meetingsBooked,
    },
    {
      icon: <Briefcase size={13} />,
      iconColor: 'text-blue-400/60',
      label: 'Total Leads',
      value: store.leads.length,
    },
  ];

  return (
    <section id="command-center" className="relative scroll-mt-20 py-8 md:py-12">
      <div className="relative">
        {/* Header */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.08] px-3 py-1">
              <Gauge size={12} className="text-accent-light" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-light">
                Mission Control
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/15">{user?.email}</span>
              <button
                onClick={signOut}
                className="rounded-md p-1.5 text-white/15 hover:bg-white/[0.06] hover:text-white/40"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
            Outreach Console
          </h1>
          <div className="mt-2 h-px w-12 bg-gradient-to-r from-accent to-transparent" />
        </motion.div>

        {/* Daily counter */}
        <div className="mb-4">
          <DailyOutreachCounter
            todayCount={store.todayCount}
            weekTotal={store.weekTotal}
            monthTotal={store.monthTotal}
            onIncrement={store.increment}
            onDecrement={store.decrement}
          />
        </div>

        {/* KPI strip */}
        <div className="mb-6 grid grid-cols-4 gap-2">
          {kpis.map(({ icon, iconColor, label, value, href, alert }) => {
            const Tag = href ? 'a' : 'div';
            return (
              <Tag
                key={label}
                {...(href ? { href } : {})}
                className="group rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-1.5">
                  <span className={iconColor}>{icon}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-white/20">
                    {label}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-semibold tabular-nums text-white/80">{value}</span>
                  {alert && (
                    <span className="flex items-center gap-0.5 text-[9px] text-rose-400/70">
                      <AlertCircle size={8} />
                      {alert}
                    </span>
                  )}
                </div>
              </Tag>
            );
          })}
        </div>

        {/* Quick add */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/15">{store.leads.length} leads tracked</span>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-accent-dim"
          >
            <Plus size={13} />
            Add Lead
          </button>
        </div>
      </div>

      <QuickAddLead open={addOpen} onClose={() => setAddOpen(false)} onAdd={store.addLead} />
    </section>
  );
}

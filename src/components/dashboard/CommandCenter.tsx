import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Plus, LogOut, MessageSquare, CalendarCheck, Bell, AlertCircle } from 'lucide-react';
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

  return (
    <section id="command-center" className="relative scroll-mt-20 py-10 md:py-16">
      <div className="relative">
        {/* Section header */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.08] px-3 py-1">
              <Gauge size={13} className="text-accent-light" />
              <span className="text-[11px] font-medium text-accent-light">Mission Control</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/20">{user?.email}</span>
              <button
                onClick={signOut}
                className="rounded-md p-1.5 text-white/20 hover:bg-white/[0.06] hover:text-white/50"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Outreach Console
          </h1>
          <div className="mt-3 h-px w-12 bg-gradient-to-r from-accent to-transparent" />
        </motion.div>

        {/* Daily outreach counter */}
        <div className="mb-5">
          <DailyOutreachCounter
            todayCount={store.todayCount}
            weekTotal={store.weekTotal}
            monthTotal={store.monthTotal}
            onIncrement={store.increment}
            onDecrement={store.decrement}
          />
        </div>

        {/* Summary strip */}
        <div className="mb-8 grid grid-cols-4 gap-3">
          {/* Unread notices */}
          <a href="#notifications" className="group rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <Bell size={12} className="text-accent-light/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">Notices</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums text-white/80">{notifSummary.totalUnread}</span>
              {notifSummary.actionRequired > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-rose-400/70">
                  <AlertCircle size={9} />
                  {notifSummary.actionRequired}
                </span>
              )}
            </div>
          </a>

          {/* Responses */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={12} className="text-emerald-400/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">Responses</span>
            </div>
            <span className="mt-1 block text-2xl font-semibold tabular-nums text-white/80">{store.responseCount}</span>
          </div>

          {/* Meetings */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-1.5">
              <CalendarCheck size={12} className="text-violet-400/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">Meetings</span>
            </div>
            <span className="mt-1 block text-2xl font-semibold tabular-nums text-white/80">{meetingsBooked}</span>
          </div>

          {/* Total Leads */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">Total Leads</span>
            </div>
            <span className="mt-1 block text-2xl font-semibold tabular-nums text-white/80">{store.leads.length}</span>
          </div>
        </div>
      </div>

      {/* Quick add */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-white/30">{store.leads.length} tracked</span>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-dim"
        >
          <Plus size={14} />
          Add Lead
        </button>
      </div>

      <QuickAddLead open={addOpen} onClose={() => setAddOpen(false)} onAdd={store.addLead} />
    </section>
  );
}

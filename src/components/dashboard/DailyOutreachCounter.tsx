import { motion } from 'framer-motion';
import { Minus, Plus, TrendingUp } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface DailyOutreachCounterProps {
  todayCount: number;
  weekTotal: number;
  monthTotal: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function DailyOutreachCounter({
  todayCount,
  weekTotal,
  monthTotal,
  onIncrement,
  onDecrement,
}: DailyOutreachCounterProps) {
  const reduced = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-accent/[0.08] blur-[80px]" />

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Main counter */}
        <div className="flex flex-col items-center sm:items-start">
          <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
            Outreach Today
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={onDecrement}
              disabled={todayCount === 0}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/40 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-20 disabled:hover:border-white/[0.08] disabled:hover:bg-white/[0.03] disabled:hover:text-white/40"
            >
              <Minus size={18} />
            </button>

            <motion.span
              key={todayCount}
              initial={reduced ? undefined : { scale: 1.15, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="min-w-[80px] text-center text-6xl font-bold tabular-nums tracking-tight text-white sm:text-7xl"
            >
              {todayCount}
            </motion.span>

            <button
              onClick={onIncrement}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent-light transition-all hover:border-accent/40 hover:bg-accent/20"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Week / month stats */}
        <div className="flex gap-6 sm:flex-col sm:gap-3 sm:text-right">
          <div>
            <div className="flex items-center gap-1.5 sm:justify-end">
              <TrendingUp size={12} className="text-white/20" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20">This Week</span>
            </div>
            <span className="text-2xl font-semibold tabular-nums text-white/70">{weekTotal}</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20 sm:text-right">This Month</span>
            <span className="text-2xl font-semibold tabular-nums text-white/70">{monthTotal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

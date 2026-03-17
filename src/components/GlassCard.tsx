import { motion } from 'framer-motion';
import { cn } from '../lib/cn';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'accent' | 'emerald' | 'amber' | 'rose' | 'none';
}

const glowColors = {
  accent: 'hover:shadow-accent-glow hover:border-accent/30',
  emerald: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:border-emerald-500/30',
  amber: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] hover:border-amber-500/30',
  rose: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.1)] hover:border-rose-500/30',
  none: '',
};

export function GlassCard({ children, className, hover = true, glow = 'accent' }: GlassCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileHover={hover && !reduced ? { y: -2, scale: 1.005 } : undefined}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md',
        'transition-all duration-300',
        hover && glowColors[glow],
        className
      )}
    >
      {children}
    </motion.div>
  );
}

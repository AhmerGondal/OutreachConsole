import { cn } from '../lib/cn';

interface BadgeProps {
  children: string;
  variant?: 'default' | 'green' | 'red' | 'amber';
}

const variants = {
  default: 'bg-white/[0.06] text-white/60 border-white/[0.08]',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  red: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        variants[variant]
      )}
    >
      {children}
    </span>
  );
}

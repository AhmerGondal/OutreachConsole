import { ExternalLink } from 'lucide-react';
import { cn } from '../lib/cn';

interface LinkButtonProps {
  href: string;
  label: string;
  className?: string;
}

export function LinkButton({ href, label, className }: LinkButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2',
        'border border-white/[0.08] bg-white/[0.04] text-sm text-white/70',
        'transition-all duration-200',
        'hover:border-accent/30 hover:bg-accent/10 hover:text-white',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        className
      )}
    >
      {label}
      <ExternalLink size={13} className="opacity-50" />
    </a>
  );
}

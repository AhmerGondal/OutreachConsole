import { CopyButton } from './CopyButton';
import { cn } from '../lib/cn';

interface CommandBlockProps {
  command: string;
  className?: string;
}

export function CommandBlock({ command, className }: CommandBlockProps) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between gap-3 rounded-lg',
        'border border-white/[0.06] bg-white/[0.02] px-4 py-3',
        'transition-all duration-200 hover:border-white/10 hover:bg-white/[0.04]',
        className
      )}
    >
      <code className="flex-1 break-all font-mono text-sm text-white/70">{command}</code>
      <CopyButton text={command} className="shrink-0 opacity-0 group-hover:opacity-100" />
    </div>
  );
}

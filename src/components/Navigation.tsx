import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Gauge, UserCheck, Database, Terminal, Mail, Send,
  Search, X, Menu,
} from 'lucide-react';
import { sections } from '../lib/playbook';
import { useActiveSection } from '../hooks/useActiveSection';
import { cn } from '../lib/cn';
import type { ReactNode } from 'react';

const iconMap: Record<string, ReactNode> = {
  Gauge: <Gauge size={16} />,
  UserCheck: <UserCheck size={16} />,
  Database: <Database size={16} />,
  Terminal: <Terminal size={16} />,
  Mail: <Mail size={16} />,
  Send: <Send size={16} />,
};

interface NavigationProps {
  onOpenSearch: () => void;
}

export function Navigation({ onOpenSearch }: NavigationProps) {
  const activeId = useActiveSection();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onOpenSearch]);

  const navContent = (
    <nav className="flex flex-col gap-0.5">
      {sections.map((s, i) => {
        const isActive = activeId === s.id;
        const showDivider = i === 1;
        return (
          <div key={s.id}>
            {showDivider && (
              <div className="my-2 border-t border-white/[0.04]">
                <div className="px-3 pb-1 pt-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/15">
                  Workflow
                </div>
              </div>
            )}
            <a
              href={`#${s.id}`}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                isActive
                  ? 'bg-accent/10 text-white'
                  : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg border border-accent/20 bg-accent/[0.08]"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 shrink-0">{iconMap[s.icon]}</span>
              <span className="relative z-10 truncate">{s.label}</span>
            </a>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-white/[0.06] bg-surface/80 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-5">
          <div className="h-2 w-2 rounded-full bg-accent animate-glow-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Outreach OS
          </span>
        </div>

        <button
          onClick={onOpenSearch}
          className="mx-3 mt-4 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white/30 transition-colors hover:border-white/10 hover:text-white/50"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/20">
            Ctrl K
          </kbd>
        </button>

        <div className="mt-4 flex-1 overflow-y-auto px-3 pb-6">
          {navContent}
        </div>
      </aside>

      {/* Mobile header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/[0.06] bg-surface/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent animate-glow-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Outreach OS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="rounded-lg p-2 text-white/40 hover:bg-white/[0.06] hover:text-white/70"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-white/40 hover:bg-white/[0.06] hover:text-white/70"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-surface/95 backdrop-blur-xl lg:hidden"
        >
          <div className="mt-16 overflow-y-auto p-4">
            {navContent}
          </div>
        </motion.div>
      )}
    </>
  );
}

import { useState } from 'react';
import { Globe, Compass, UserSearch } from 'lucide-react';
import { playbook } from '../../lib/playbook';
import { SectionWrapper } from '../SectionWrapper';
import { CommandBlock } from '../CommandBlock';
import { GlassCard } from '../GlassCard';
import { Badge } from '../Badge';
import { cn } from '../../lib/cn';

type Tab = 'linkedin' | 'google' | 'expanded';

export function DiscoverySection() {
  const { discovery } = playbook;
  const [activeTab, setActiveTab] = useState<Tab>('linkedin');

  const tabs: { id: Tab; label: string; icon: typeof Globe }[] = [
    { id: 'linkedin', label: 'LinkedIn', icon: UserSearch },
    { id: 'google', label: 'Google Operators', icon: Globe },
    { id: 'expanded', label: 'Expanded Discovery', icon: Compass },
  ];

  const channel = discovery[activeTab];

  return (
    <SectionWrapper id="discovery" title="Discovery Commands" subtitle={discovery.intro}>
      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all duration-200',
                activeTab === tab.id
                  ? 'border border-accent/30 bg-accent/10 text-white'
                  : 'border border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60'
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Instructions */}
      <GlassCard className="mb-6 p-4" hover={false}>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">How to use</h4>
        <ul className="space-y-1">
          {channel.instructions.map((step) => (
            <li key={step} className="flex items-start gap-2 text-sm text-white/50">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-light/50" />
              {step}
            </li>
          ))}
        </ul>
      </GlassCard>

      {/* Commands */}
      <div className="space-y-3">
        {channel.commands.map((cmd) => (
          <div key={cmd.title}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-white/60">{cmd.title}</span>
            </div>
            <CommandBlock command={cmd.command} />
            <p className="mt-1 text-xs text-white/30">{cmd.note}</p>
          </div>
        ))}
      </div>

      {/* LinkedIn filters (only on linkedin tab) */}
      {activeTab === 'linkedin' && channel.filters && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <GlassCard className="p-4" hover={false}>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">Target Titles</h4>
            <div className="flex flex-wrap gap-1.5">
              {channel.filters.titles.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">Company Size</h4>
            <div className="flex flex-wrap gap-1.5">
              {channel.filters.companySize.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">Industries</h4>
            <div className="flex flex-wrap gap-1.5">
              {channel.filters.industries.map((i) => (
                <Badge key={i}>{i}</Badge>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">Location</h4>
            <div className="flex flex-wrap gap-1.5">
              {channel.filters.location.map((l) => (
                <Badge key={l}>{l}</Badge>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </SectionWrapper>
  );
}

import { useState } from 'react';
import { MessageCircle, Mail, RotateCcw } from 'lucide-react';
import { playbook } from '../../lib/playbook';
import { SectionWrapper } from '../SectionWrapper';
import { GlassCard } from '../GlassCard';
import { CopyButton } from '../CopyButton';
import { cn } from '../../lib/cn';

type Channel = 'linkedin' | 'email' | 'followUp';

export function MessagingSection() {
  const { messaging } = playbook;
  const [active, setActive] = useState<Channel>('linkedin');

  const tabs: { id: Channel; label: string; icon: typeof Mail }[] = [
    { id: 'linkedin', label: 'LinkedIn', icon: MessageCircle },
    { id: 'email', label: 'Cold Email', icon: Mail },
    { id: 'followUp', label: 'Follow-Up', icon: RotateCcw },
  ];

  const channel = messaging[active];

  return (
    <SectionWrapper id="messaging" title="Messaging Guidance" subtitle="Direct instructions for each outreach channel. Keep it short, relevant, and optimized for reply.">
      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all duration-200',
                active === tab.id
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
      <GlassCard className="mb-6 p-5" hover={false}>
        <h4 className="mb-3 text-xs font-semibold text-white/70">{channel.title}</h4>
        <ul className="space-y-2">
          {channel.instructions.map((step) => (
            <li key={step} className="flex items-start gap-2 text-sm text-white/50">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-light/50" />
              {step}
            </li>
          ))}
        </ul>
      </GlassCard>

      {/* Example */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Example Message</h4>
          <CopyButton text={channel.example} size={13} />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-white/50">
            {channel.example}
          </pre>
        </div>
      </div>
    </SectionWrapper>
  );
}

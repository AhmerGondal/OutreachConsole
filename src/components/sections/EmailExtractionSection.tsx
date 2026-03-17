import { Mail, ExternalLink, AlertTriangle } from 'lucide-react';
import { playbook } from '../../lib/playbook';
import { SectionWrapper } from '../SectionWrapper';
import { GlassCard } from '../GlassCard';
import { CopyButton } from '../CopyButton';

export function EmailExtractionSection() {
  const { emailExtraction } = playbook;

  return (
    <SectionWrapper id="email-extraction" title="Email Extraction" subtitle="Step-by-step process to find and verify founder emails.">
      {/* Steps */}
      <div className="mb-8 space-y-2">
        {emailExtraction.steps.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xs font-bold text-accent-light">
              {i + 1}
            </div>
            <span className="text-sm text-white/60">{step}</span>
          </div>
        ))}
      </div>

      {/* Tools */}
      <div className="mb-6">
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">Discovery Tools</h3>
        <div className="flex flex-wrap gap-2">
          {emailExtraction.tools.map((tool) => (
            <a
              key={tool.title}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/60 transition-all hover:border-accent/30 hover:bg-accent/10 hover:text-white"
            >
              <Mail size={13} className="text-accent-light" />
              {tool.title}
              <ExternalLink size={10} className="opacity-40" />
            </a>
          ))}
        </div>
      </div>

      {/* Common patterns */}
      <GlassCard className="mb-6 p-4" hover={false}>
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">Common Email Patterns</h3>
        <div className="space-y-1.5">
          {emailExtraction.commonPatterns.map((pattern) => (
            <div
              key={pattern}
              className="group flex items-center justify-between rounded-md border border-white/[0.04] bg-white/[0.02] px-3 py-2"
            >
              <code className="font-mono text-sm text-white/50">{pattern}</code>
              <CopyButton text={pattern} className="opacity-0 group-hover:opacity-100" size={12} />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Rule */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
        <AlertTriangle size={16} className="shrink-0 text-amber-400" />
        <span className="text-sm font-medium text-amber-400/80">{emailExtraction.rule}</span>
      </div>
    </SectionWrapper>
  );
}

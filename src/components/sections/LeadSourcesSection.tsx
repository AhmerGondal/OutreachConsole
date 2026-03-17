import { ExternalLink, Database } from 'lucide-react';
import { playbook } from '../../lib/playbook';
import { SectionWrapper } from '../SectionWrapper';
import { GlassCard } from '../GlassCard';

export function LeadSourcesSection() {
  const sources = playbook.leadSources;

  return (
    <SectionWrapper id="lead-sources" title="Lead Sources" subtitle="Find startups to reach out to. Open a source, filter, and start building your list.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((source) => (
          <GlassCard key={source.title} className="flex flex-col p-5" glow="accent">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-accent-light" />
                <h3 className="text-sm font-semibold text-white/80">{source.title}</h3>
              </div>
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-medium text-accent-light">
                {source.tag}
              </span>
            </div>
            <p className="flex-1 text-sm leading-relaxed text-white/40">{source.description}</p>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-medium text-accent-light transition-all hover:border-accent/40 hover:bg-accent/20 hover:text-white"
            >
              Open <ExternalLink size={12} />
            </a>
          </GlassCard>
        ))}
      </div>
    </SectionWrapper>
  );
}

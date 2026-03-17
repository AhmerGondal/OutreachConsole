import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { exportLeadsJSON, importLeadsJSON } from '../../lib/leadTracker';
import { LeadTable } from '../dashboard/LeadTable';
import { LeadDetailDrawer } from '../dashboard/LeadDetailDrawer';
import { SectionWrapper } from '../SectionWrapper';
import type { LeadStore } from '../../hooks/useLeadStore';
import type { LeadRecord } from '../../types/leadTracker';

interface ResponseTrackerSectionProps {
  store: LeadStore;
}

export function ResponseTrackerSection({ store }: ResponseTrackerSectionProps) {
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);

  const currentLead = selectedLead
    ? store.leads.find((l) => l.id === selectedLead.id) ?? null
    : null;

  const handleExport = () => {
    const json = exportLeadsJSON(store.leads);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outreach-leads-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const imported = importLeadsJSON(text);
      if (imported) {
        store.importLeads(imported);
      }
    };
    input.click();
  };

  return (
    <SectionWrapper id="lead-tracker" title="Response Tracker" subtitle="Track outreach responses and lead status. Synced to your account.">
      <div className="mb-4 flex items-center justify-end gap-1.5">
        <button
          onClick={handleExport}
          className="rounded-md p-1.5 text-white/20 hover:bg-white/[0.06] hover:text-white/50"
          title="Export leads as JSON"
        >
          <Download size={14} />
        </button>
        <button
          onClick={handleImport}
          className="rounded-md p-1.5 text-white/20 hover:bg-white/[0.06] hover:text-white/50"
          title="Import leads from JSON"
        >
          <Upload size={14} />
        </button>
      </div>

      <LeadTable
        leads={store.filteredLeads}
        searchQuery={store.searchQuery}
        onSearchChange={store.setSearchQuery}
        statusFilter={store.statusFilter}
        onStatusFilterChange={store.setStatusFilter}
        platformFilter={store.platformFilter}
        onPlatformFilterChange={store.setPlatformFilter}
        onSelectLead={setSelectedLead}
      />

      <LeadDetailDrawer
        lead={currentLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={store.updateLead}
        onDelete={store.removeLead}
      />
    </SectionWrapper>
  );
}

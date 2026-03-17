import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Trash2 } from 'lucide-react';
import type { LeadRecord, LeadStatus, LeadPlatform } from '../../types/leadTracker';
import { LEAD_STATUSES, LEAD_PLATFORMS } from '../../lib/leadTracker';
import { cn } from '../../lib/cn';

interface LeadDetailDrawerProps {
  lead: LeadRecord | null;
  onClose: () => void;
  onUpdate: (id: string, fields: Partial<Omit<LeadRecord, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<LeadStatus, string> = {
  'New': 'bg-white/10 text-white/60',
  'Contacted': 'bg-accent/15 text-accent-light',
  'Replied': 'bg-blue-500/15 text-blue-400',
  'Positive': 'bg-emerald-500/15 text-emerald-400',
  'Negative': 'bg-rose-500/15 text-rose-400',
  'Follow Up': 'bg-amber-500/15 text-amber-400',
  'Meeting Booked': 'bg-violet-500/15 text-violet-400',
};

export function LeadDetailDrawer({ lead, onClose, onUpdate, onDelete }: LeadDetailDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPlatform, setEditPlatform] = useState<LeadPlatform>('LinkedIn');
  const [editNotes, setEditNotes] = useState('');

  const startEdit = () => {
    if (!lead) return;
    setEditName(lead.name);
    setEditCompany(lead.companyName);
    setEditUrl(lead.profileUrl);
    setEditPlatform(lead.platform);
    setEditNotes(lead.notes);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!lead) return;
    onUpdate(lead.id, {
      name: editName.trim() || lead.name,
      companyName: editCompany.trim() || lead.companyName,
      profileUrl: editUrl.trim(),
      platform: editPlatform,
      notes: editNotes.trim(),
    });
    setEditing(false);
  };

  return (
    <AnimatePresence>
      {lead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="h-full w-full max-w-md overflow-y-auto border-l border-white/[0.06] bg-surface-50/98 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-surface-50/95 px-5 py-4 backdrop-blur-md">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-white">{lead.name}</h2>
                <p className="text-xs text-white/40">{lead.companyName} &middot; {lead.platform}</p>
              </div>
              <div className="flex items-center gap-1">
                {lead.profileUrl && (
                  <a
                    href={lead.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-2 text-white/30 hover:bg-white/[0.06] hover:text-white/60"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
                <button onClick={onClose} className="rounded-md p-2 text-white/30 hover:bg-white/[0.06] hover:text-white/60">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {/* Status */}
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-white/25">Status</label>
                <select
                  value={lead.status}
                  onChange={(e) => onUpdate(lead.id, { status: e.target.value as LeadStatus })}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-accent/40"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-surface-100">{s}</option>
                  ))}
                </select>
                <div className="mt-2">
                  <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-medium', statusColors[lead.status])}>
                    {lead.status}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-white/25">Notes</label>
                <p className="min-h-[2rem] text-sm leading-relaxed text-white/50">
                  {lead.notes || 'No notes yet.'}
                </p>
              </div>

              {/* Quick links */}
              <div>
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">Quick Links</h4>
                <div className="flex flex-wrap gap-1.5">
                  <a href="#discovery" onClick={onClose} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/40 hover:border-accent/30 hover:text-white/70">Discovery</a>
                  <a href="#email-extraction" onClick={onClose} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/40 hover:border-accent/30 hover:text-white/70">Email Extraction</a>
                  <a href="#messaging" onClick={onClose} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/40 hover:border-accent/30 hover:text-white/70">Messaging</a>
                </div>
              </div>

              {/* Edit fields */}
              {!editing ? (
                <button
                  onClick={startEdit}
                  className="text-xs text-white/30 hover:text-white/50"
                >
                  Edit lead details
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-accent/40" />
                    <input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company" className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-accent/40" />
                  </div>
                  <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="Profile URL" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-accent/40" />
                  <select value={editPlatform} onChange={(e) => setEditPlatform(e.target.value as LeadPlatform)} className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-accent/40">
                    {LEAD_PLATFORMS.map((p) => <option key={p} value={p} className="bg-surface-100">{p}</option>)}
                  </select>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} placeholder="Notes" className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-accent/40" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-light hover:bg-accent/25">Save</button>
                    <button onClick={() => setEditing(false)} className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-white/40 hover:bg-white/[0.08]">Cancel</button>
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="text-[10px] text-white/15">
                Added {new Date(lead.createdAt).toLocaleDateString()}
              </div>

              {/* Delete */}
              <div className="border-t border-white/[0.04] pt-4">
                <button
                  onClick={() => {
                    onDelete(lead.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-xs text-rose-400/50 hover:text-rose-400"
                >
                  <Trash2 size={12} />
                  Delete lead
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

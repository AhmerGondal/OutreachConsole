import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { LEAD_PLATFORMS } from '../../lib/leadTracker';
import type { LeadPlatform } from '../../types/leadTracker';
import { cn } from '../../lib/cn';

interface QuickAddLeadProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; companyName: string; platform: LeadPlatform; profileUrl?: string; notes?: string }) => void;
}

export function QuickAddLead({ open, onClose, onAdd }: QuickAddLeadProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [platform, setPlatform] = useState<LeadPlatform>('LinkedIn');
  const [profileUrl, setProfileUrl] = useState('');
  const [notes, setNotes] = useState('');

  const canSubmit = name.trim() && company.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd({
      name: name.trim(),
      companyName: company.trim(),
      platform,
      profileUrl: profileUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setName('');
    setCompany('');
    setPlatform('LinkedIn');
    setProfileUrl('');
    setNotes('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[12vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-100/95 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-accent-light" />
                <h2 className="text-sm font-semibold text-white">Add Lead</h2>
              </div>
              <button onClick={onClose} className="rounded-md p-1 text-white/30 hover:bg-white/[0.06] hover:text-white/60">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-white/40">Name *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Chen"
                    autoFocus
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-accent/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-white/40">Company *</span>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="DataFlow AI"
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-accent/40"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-white/40">Platform</span>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as LeadPlatform)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent/40"
                  >
                    {LEAD_PLATFORMS.map((p) => (
                      <option key={p} value={p} className="bg-surface-100">{p}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-white/40">Profile URL</span>
                  <input
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-accent/40"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-white/40">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Recently funded, hiring engineers..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-accent/40"
                />
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  canSubmit
                    ? 'bg-accent text-white hover:bg-accent-dim'
                    : 'cursor-not-allowed bg-white/[0.04] text-white/20'
                )}
              >
                Add Lead
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

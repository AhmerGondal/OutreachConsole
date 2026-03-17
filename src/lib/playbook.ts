import type { Playbook, Section } from '../types/playbook';
import data from '../data/playbook.json';

export const playbook: Playbook = data as Playbook;

export const sections: Section[] = [
  { id: 'command-center', label: 'Mission Control', icon: 'Gauge' },
  { id: 'lead-sources', label: 'Lead Sources', icon: 'Database' },
  { id: 'discovery', label: 'Discovery', icon: 'Terminal' },
  { id: 'email-extraction', label: 'Email Extraction', icon: 'Mail' },
  { id: 'messaging', label: 'Messaging', icon: 'Send' },
  { id: 'lead-tracker', label: 'Response Tracker', icon: 'UserCheck' },
];

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function getSectionById(id: string): Section | undefined {
  return sections.find((s) => s.id === id);
}

export function searchPlaybook(query: string): Section[] {
  if (!query.trim()) return sections;
  const q = query.toLowerCase();
  return sections.filter(
    (s) =>
      s.label.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
  );
}

export function searchCommands(query: string): string[] {
  const allCommands = [
    ...playbook.discovery.linkedin.commands.map((c) => c.command),
    ...playbook.discovery.google.commands.map((c) => c.command),
    ...playbook.discovery.expanded.commands.map((c) => c.command),
  ];

  if (!query.trim()) return allCommands;

  const q = query.toLowerCase();
  return allCommands.filter((c) => c.toLowerCase().includes(q));
}

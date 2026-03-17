# Contract Outreach Engine

Local-first outreach cockpit with two core KPIs, a lean lead tracker, and an integrated playbook.

## Quick Start

```bash
npm install
npm run dev
```

## How It Works

This is a **daily outreach cockpit** — not a CRM, not a dashboard with ten metrics.

When you open the app, **Mission Control** dominates the experience with exactly **2 KPIs**:

1. **Daily Outreach Count** — A large interactive counter (+1 / -1) that tracks how many outreach touches you do today. Date-aware, auto-resets each day. Shows week and month totals.
2. **Response Tracker** — A lean lead list showing responses, meetings booked, and total leads. Click any lead to update status, add notes, or jump to relevant playbook sections.

The playbook sections (strategy, commands, templates) sit below as reference material, deeply linked from the lead detail drawer.

## Lead Tracker

Persists locally via localStorage. No backend needed.

### Adding a lead
Click **Add Lead**. Fill in name, company, platform, URL, and notes.

### Managing leads
Click any lead row to open the detail drawer where you can:
- Change status (New, Contacted, Replied, Positive, Negative, Follow Up, Meeting Booked)
- Edit all fields and notes
- Jump to relevant playbook sections
- Delete the lead

### Import / Export
Use the toolbar buttons to:
- **Export** all leads as JSON
- **Import** leads from a JSON file
- **Reset** to seed demo data

## How to Update Playbook Content

Edit `src/data/playbook.json` — all playbook sections render from this single file.

## Architecture

```
src/
  data/
    playbook.json             # Playbook content
    leadSeed.ts               # Demo seed data
  types/
    leadTracker.ts            # Lead types (simplified)
    playbook.ts               # Playbook type definitions
  lib/
    dailyCounter.ts           # Date-keyed daily outreach counter
    leadTracker.ts            # Lead CRUD, filters, import/export
    storage.ts                # localStorage persistence layer
    playbook.ts               # Playbook data access, search
    cn.ts                     # Tailwind class merge utility
  hooks/
    useLeadStore.ts           # Lead + daily counter state
    useActiveSection.ts       # Scroll spy for nav
    useReducedMotion.ts       # prefers-reduced-motion
  components/
    dashboard/
      CommandCenter.tsx       # Main execution hub (2 KPIs)
      DailyOutreachCounter.tsx # Interactive daily counter
      LeadTable.tsx           # Searchable/filterable lead list
      LeadDetailDrawer.tsx    # Lead detail + actions drawer
      QuickAddLead.tsx        # Quick add modal
    sections/                 # Playbook reference sections
    [shared components]       # GlassCard, CopyButton, Badge, etc.
  App.tsx                     # Layout: execution + playbook
```

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v3
- Framer Motion
- Lucide React icons
- localStorage for persistence
- clsx + tailwind-merge

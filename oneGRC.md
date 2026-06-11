# OneGRC — Project Report

**Unified Governance, Risk & Compliance platform for Sankalp Pension Funds Pvt. Ltd.**
A customer-facing, pre-sales prototype on a vendor-neutral, J2W-architected GRC/IRM backbone.

---

## 1. Executive summary

A PFRDA-regulated NPS pension fund manager runs governance, risk and compliance across **two
disconnected tools and a sprawl of spreadsheets** — IT/security risk in one place,
enterprise/regulatory compliance in another, and the board never sees one picture.

**OneGRC** puts every risk, control, obligation, incident, policy and piece of evidence on **one
shared data model**, so a control failure, a security incident, a regulatory change and a board
report all reconcile to the same underlying objects — on one regulatory clock.

> **One platform instead of two.** One taxonomy of risks, controls, issues, obligations and
> evidence. Every regulator, one calendar, one evidence trail.

The customer's existing in-house ITSM (**Sankalp ServiceDesk**) is **kept and integrated as a
spoke, not replaced**; OneGRC is the governance layer on top. The backbone is **vendor-neutral** —
backbone selection remains a later customer decision.

## 2. The customer & the thesis

- **Org:** Sankalp Pension Funds Pvt. Ltd. (SPF) — PFRDA-registered NPS Pension Fund Manager,
  Category I Regulated Entity, subsidiary of Sankalp Bank. AUM **₹3,24,718 cr**, **41,86,902**
  subscribers, schemes E/C/G/A across Tier I & II + CG/SG/Corporate/APY.
- **Pain solved:** manual point-in-time evidence; the same control re-tested per framework;
  India's multi-clock breach problem (CERT-In 6h, PFRDA 48h, DPDP ~72h at once); ~8,000 statutory
  changes/year with weak native-India content in global tools; PFRDA returns tracked by hand.
- **Thesis motif (pervasive):** every object carries a *"where this also appears"* cross-reference —
  the same record surfaces across IT-GRC and enterprise/regulatory views with one evidence trail.

## 3. What's built (full A5 route map)

All 27 routes are implemented; nothing is a placeholder except the `*` not-found fallback.

| Area | Routes |
|---|---|
| **Home — Board Cockpit** | `/` — 6 KPIs, 5×5 enterprise risk heat map, needs-attention, cross-domain activity, 30-day trends |
| **My Queue** | `/queue` — role-aware task list (swaps with the role switcher) |
| **Risk Register** | `/risks`, `/risks/:id` — 140 risks, inherent-vs-residual map, CrossRefPanel |
| **Control Library + CCM** | `/controls`, `/controls/:id` (5 tabs), `/ccm`, `/ccm/:id` — "map once, satisfy many"; a failing patch-SLA rule auto-escalating to an Issue + Incident |
| **Policies** | `/policies`, `/policies/:id` — versioned, mapped controls, maker-checker approval chain |
| **Incidents + Clocks** | `/incidents`, `/incidents/:id` (marquee **INC-2026-0411**), `/clocks` — three live regulator tracks, one timeline, one evidence trail |
| **Compliance** | `/obligations` (list + calendar), `/obligations/:id`, `/reg-change`, `/reg-change/:id`, `/pfrda` — every regulator on one calendar; reg-change auto-updates obligations + controls |
| **DPDP / Data Governance** | `/dpdp`, `/dpdp/dsar/:id` — inventory, consent ledger, DSAR queue, worked erasure-vs-retention case, breach → incident |
| **Audit & Assurance** | `/audits`, `/audits/:id`, `/issues`, `/issues/:id`, `/evidence` — findings→issues, bulk-select, 600-item evidence vault (~70% auto) |
| **Integrations** | `/integrations` — hand-built backbone-plus-spokes SVG (closing shot) |
| **Settings** | `/settings` — 9-section admin surface (org, users/roles, frameworks, regulator clocks, maker-checker, integrations, retention, notifications, audit log) |

## 4. The marquee — INC-2026-0411

"Ransomware on fund-accounting server", detected **Wed 10 Jun 2026, 02:14 IST** via Splunk SIEM
(ticketed in Sankalp ServiceDesk; assets enriched from the CMDB), auto-classified **CRITICAL**
under PFRDA ICS 2024. One incident record drives **three live regulator clocks** —
**CERT-In** (6h, ~03:11 remaining), **PFRDA** (48h subscriber-impacting), **DPDP Board** (~72h) —
from **one timeline and one evidence trail**, producing three regulator outputs.

## 5. Seeded world (deterministic)

~140 risks · ~260 controls (each mapped to 2–4 frameworks; 38 CCM-automated; coverage 96.2%) ·
~180 obligations (9 overdue, 23 due ≤30 days) · ~60 incidents · ~45 policies · ~120 issues ·
~600 evidence items (~70% auto) · ~18 audits (27 open findings) · ~90 regulatory changes
(12,973 captured in 2025) · ~120 data assets · 14 open DSARs · full 15-person roster.

All entities cross-link by id; the world is anchored to a fixed "now" so live countdowns are
stable across reloads.

## 6. Architecture & stack

- **Stack:** React 18 + TypeScript + Vite · Tailwind CSS · shadcn-style primitives · Recharts ·
  React Router · Zustand · date-fns · lucide-react.
- **Layout:** `src/types` (entities) · `src/data` (deterministic seed generators) · `src/pages`
  (one per route) · `src/components` (reusable vocabulary) · `src/lib` (clocks, formatting,
  heat-map, cross-ref) · `src/store` (Zustand session state).
- **Component vocabulary:** PageHeader, KpiTile, SeverityBadge, StatusChip, FrameworkPill,
  RegulatorClock (one shared `useInterval`), DataTable (sortable/filterable/bulk-select, never
  empty), CrossRefPanel, EvidenceList, Drawer, Timeline, RoleSwitcher, CommandSearch (⌘K).
- **Hand-built SVG:** enterprise risk heat map, inherent-vs-residual map, backbone-plus-spokes
  diagram (animated entry).

## 7. Realism & scope guardrails

- Real Indian names, real identifier formats (PRAN masked `1100 7845 ••••`, `RISK-IT-0142`,
  `CTRL-ISO-A.8.9`, `OBL-PFRDA-Q1-07`, `INC-2026-0411`, …), real framework/regulator terminology,
  non-round numbers, real IST timestamps. No lorem, no empty tables, no placeholder timestamps.
- Session state is in-memory (resets on reload). Exports/uploads/approvals are optimistic UI +
  toast/drawer. Role switcher is the only "auth". Desktop only (≥1024px).
- The backbone is never branded as any single vendor.

## 8. Demo walkthrough (~3–4 min)

Board Cockpit → live CERT-In clock → **INC-2026-0411** (three clocks, one trail) → failing CCM
patch-SLA rule (auto-spawned Issue + Incident) → control **Mappings** (four frameworks, "map
once") → Obligations calendar + GSTR-3B reg-change auto-update → PFRDA Pack → DPDP DSAR
erasure-vs-retention → **Integrations** backbone-plus-spokes (slogan lands).

## 9. Running locally

```bash
npm install
npm run dev      # http://localhost:5173  (desktop, ≥1024px)
npm run build    # tsc + vite production build
```

---

*OneGRC is a pre-sales prototype. Data is illustrative; no real subscriber PII is used.*

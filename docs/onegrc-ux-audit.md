# OneGRC - Enterprise UX Audit and Target-State Redesign

> **Status:** Reviewable deliverable (Phase 0, Epic 0.1). This document is the design contract for
> the redesign. It audits the app as currently built (`docs/SYSTEM-SPEC.md`), defines the target
> enterprise standard, the 7-persona model, the information architecture, the shared pattern kit,
> and the reporting framework, then audits every screen with concrete target states. Implementation
> (Epics 0.2 onward) follows this. Adjust here before building.

---

## 1. Purpose and method

The app is functionally rich but reads as a **single-altitude demo**: one cockpit for everyone,
wide dense tables, a global vital-signs strip that shows incident counts on every screen regardless
of who is looking, and several pages (`/sources`, `/controls`) that present everything at once with
weak grouping. The redesign goal: a **modern, role-based GRC product** where each persona sees only
what is theirs, dense data is revealed progressively, and every screen has a clear visual hierarchy
and a primary job.

Audited against the current build + the functional spec personas (Section 4) and the customer's
stated 7 functional roles. Each screen entry below states **Current / Problems / Target**.

---

## 2. Target design language

Reference points: ServiceNow Now Platform, Vanta, Drata, Linear, Atlan, Snowsight. Keep the
existing calm light theme and token system (`src/index.css`); raise the bar on hierarchy and rhythm.

- **Altitude before detail.** Every screen opens with a tight summary band (3-5 stats or a
  role-scoped "what needs me"), then the working surface, then drill-in. No screen dumps a 12-column
  table as the first thing the eye lands on.
- **Progressive disclosure.** Segment, group, and collapse. Master-detail and tabs over ultra-wide
  tables. Secondary metadata moves into expandable rows, drawers, or detail tabs.
- **Color is state, not decoration.** Severity/status only. Reduce competing accent colors.
- **One primary action per surface.** Secondary actions demote to overflow or detail.
- **Visual hierarchy.** Consistent type scale, generous section spacing, card grouping, quiet
  borders. Tabular figures for all numerics (already have `tnum`).
- **Role relevance.** Hide, don't gray out, what a persona never uses. Sidebar groups collapse per
  persona; the vital strip becomes contextual.
- **Density with legibility.** Still governance-grade dense, but grouped and scannable. Default
  table view shows the columns a persona needs; the rest are opt-in.

---

## 3. The 7-persona model

Replaces the 6 named-executive roles. The switcher selects a **functional persona**; each is backed
by a representative named person from the roster (preserved as fixtures). Multiple roster people map
to one persona.

| Persona | Key | Line | Representative(s) | Primary job |
|---|---|---|---|---|
| Executive | `EXEC` | Board | Meera Krishnan (CRO) [default] | Oversight roll-up + exceptions; board pack |
| Risk Manager | `RISK` | 2 | Sanjay Verma; Meera | Risk register, heat map, treatment, consequence |
| Compliance Manager | `CCO` | 2 | Anjali Deshmukh; Vikram Rao | Obligation coverage, calendar, approvals, clause decisions |
| Compliance Analyst | `ANALYST` | 1 | Deepa Iyer; Farhan Ali | My filings + clause pipeline work + evidence capture |
| Control Owner | `CTRLOWNER` | 1 | Rohan Gupta; Karthik Nair; Rajesh Iyer | My controls, tests due, CCM, evidence |
| Auditor | `AUDITOR` | 3 | Sunita Menon; Lakshmi Rao | Audits, findings, remediation, evidence trail |
| Administrator | `ADMIN` | - | Imran Sheikh (platform admin) | Org/users/roles/frameworks/config, audit log |

**Role-gated authority** (from spec Section 4 / 10): accepting a clause as a tracked obligation and
engaging a specialist remain restricted to the compliance-accountable personas: **Compliance
Manager** (and Executive may view). Maker-and-checker: maker cannot approve own work, enforced via
`useCanAct`.

Notes: DPO duties (Priya) fold into Compliance Manager/Analyst for DPDP screens. CISO (Rajesh) maps
to Control Owner for the security control surface but lands on the Control Owner dashboard.

---

## 4. Role-relevance matrix

P = primary (lands here / core), S = secondary (available), - = hidden from nav for this persona.

| Screen | EXEC | RISK | CCO | ANALYST | CTRLOWNER | AUDITOR | ADMIN |
|---|---|---|---|---|---|---|---|
| Home (role dashboard) | P | P | P | P | P | P | P |
| My Queue | S | S | P | P | P | P | S |
| Risk Register | P | P | S | - | S | S | - |
| Control Library | S | S | S | - | P | S | - |
| Continuous Monitoring | S | - | - | - | P | S | - |
| Policies | S | S | P | S | S | S | - |
| Incidents | P | S | S | - | P | S | - |
| Regulator Clocks | P | S | P | S | S | S | - |
| Obligations & Calendar | S | S | P | P | S | S | - |
| Regulatory Change | S | S | P | P | - | S | - |
| Source Library | S | S | P | P | - | S | - |
| PFRDA Pack | P | S | P | S | S | S | - |
| DPDP / Data Governance | S | S | P | P | S | S | - |
| Audits | S | S | S | - | S | P | - |
| Issues & Remediation | S | S | S | S | P | P | - |
| Evidence Vault | S | - | S | S | S | P | - |
| Integrations | S | - | - | - | - | - | P |
| Settings | - | - | S | - | - | - | P |

Hidden items still reachable via command search and deep links; they just leave the persona's
sidebar to cut clutter. The matrix drives sidebar grouping (Section 5) and dashboard composition.

---

## 5. Information architecture and navigation

**Sidebar becomes persona-aware.** Keep the fixed canonical order (`nav-config.ts`) but render only
the groups/items where the persona is P or S; collapse groups with no P item by default. Example:
Compliance Analyst sees Home, My Queue, Obligations, Source Library, Regulatory Change, DPDP, with
Risk/Audit/Integrations hidden. Administrator sees Home, Settings, Integrations, Users.

**The global "Open Incidents" vital is the headline IA defect.** `ContextStrip` shows
openIncidents / nearest clock / coverage / overdue / findings on **every** screen for **every**
role. For an Auditor reading a findings list or an Analyst filing GST, a live incident counter is
noise. Target:

- Replace the fixed vital strip with a **contextual "Needs me" strip**: a compact, role-scoped row
  of the few items demanding this persona's action now. Executive/Control Owner see live
  incident/clock vitals; Compliance Analyst sees filings due + approvals waiting; Auditor sees open
  findings + evidence requests; etc. Each persona's strip is composed from the role-relevance model,
  not hardcoded.
- The strip is also **context-aware by screen**: on the Incident detail it shows the incident
  clocks; on Obligations it shows due/overdue; it does not repeat the same five numbers everywhere.
- Keep a single quiet right-aligned environment line (spokes connected) - that is ambient, not a
  call to action.

**Command search and cross-references stay global** - they are the connective tissue and are not
clutter.

---

## 6. Shared pattern kit (Epic 0.3)

Thin, reusable building blocks so per-screen redesign is consistent and fast (prevents drift under
the incremental approach):

- **`RoleDashboard`** - the landing-page shell: greeting + summary band + a composable grid of
  role-relevant cards (each card is a focused widget: my queue, exceptions, a metric group, a
  watchlist, a trend, a report shortcut). Drives all 7 dashboards.
- **`SummaryCards` / `StatGroup`** - the opening summary band: 3-5 KPI/stat tiles with tone,
  trend, drill target. Replaces ad hoc pill rows.
- **`SegmentedList` / grouped table** - a list that segments by a key (status, regulator,
  framework, owner) with collapsible groups and per-group counts. The antidote to wide flat tables.
- **`Section`** - a collapsible, titled content block for progressive disclosure on detail pages.
- **`SavedViews` / filter chips** - named filter presets + visible active-filter chips above lists.
- **`NeedsMe`** - the contextual role/screen-scoped attention strip (Section 5).
- **`ReportTemplate` kit** - a report definition type + a preview drawer + export-as-artifact
  action; reused by every module's reporting (Section 7).

These compose with the existing vocabulary (PageHeader, DataTable, KpiTile, Drawer, Tabs,
CrossRefPanel). DataTable gains optional grouping; KpiTile is reused inside SummaryCards.

---

## 7. Reporting framework

Today reporting is ad hoc: mock export drawers and 6 hardcoded PFRDA template buttons. Target: a
**report-template registry**, role-scoped, each producing a session artifact (preview drawer ->
"generate" -> artifact in the artifacts seam, listed on the dashboard).

| Module | Templates (seeded) | Personas |
|---|---|---|
| Risk | Risk register report; Heat-map snapshot; Top-risks treatment status | EXEC, RISK |
| Control | Control test summary; Coverage-by-framework; Failing-controls report | CTRLOWNER, EXEC, AUDITOR |
| Obligations | Obligation status register; Regulatory filing calendar; Maker-checker log | CCO, ANALYST |
| Compliance/Board | Board compliance report; Inspection-readiness pack | EXEC, CCO |
| Incident | CERT-In Annexure I; PFRDA ICS intimation; DPDP breach intimation (extend existing) | CTRLOWNER, EXEC |
| Audit | Audit report; Findings register; Remediation status | AUDITOR |
| DSAR | DSAR response pack + audit record | CCO, ANALYST |
| PFRDA pack | Quarterly return, ICS self-assessment, etc. (migrate existing 6 into the kit) | EXEC, CCO |

Reports are views of live effective state, generated on demand (spec 5.8 / Req 13). No generated
text is evidence (spec Section 10).

---

## 8. Per-screen audit

### 8.1 Source Library `/sources` + act + clause detail [LEAD]

- **Current.** One flat table of 22 instruments (act, authority, type, #clauses, awaiting, status,
  last updated), sorted by awaiting. Act detail = two lead cards + a very wide clause table with ~9
  columns (clause, name, description, what-it-means, penalty, due, applicability, status, action).
  Clause detail is a solid two-column layout.
- **Problems.** The act table mixes things needing a decision with reference standards and tracked
  acts in one list. The clause table is the worst density offender in the app: 9 columns including
  three long free-text fields (description, what-it-means) crammed into rows; the pipeline action
  hides at the far right. Hard to scan, hard to act. No grouping by regulator. Reference standards
  (ISO/NIST/PCI) clutter the working list.
- **Target.**
  - `/sources` as a **segmented worklist**: top segment "Needs decision" (Processing/Recommended/
    Specialist), then "Tracked", then a collapsed "Reference standards". Summary band: acts /
    clauses / awaiting decision / saved to controls. Group within segments by regulator/authority.
    Trim columns to act, authority, #clauses, awaiting, status; move dates into the row hover/detail.
  - Act detail as **master-detail clause reader**: a left list of clauses (number + name + status +
    severity dot, grouped by theme) and a right reading pane showing the selected clause's
    requirement, key parts, extract, penalty tiers, recommendation, and the decision action as the
    primary button. Removes the wide table entirely. The act summary cards stay at top.
  - Clause detail: keep structure; tighten hierarchy, make Save/Specialist the single primary
    action (role-gated to Compliance Manager), and surface the mapped control + reverse "what this
    produced" prominently.

### 8.2 Control Library `/controls` + control detail [LEAD]

- **Current.** Flat table of 264 controls (id, title, frameworks, satisfies-clauses, owner, type,
  automation, last tested, result, evidence count) + 4 stat pills. Detail has a good 5-tab layout.
- **Problems.** 10 columns over 264 rows is a wall. No grouping; everything one altitude. A Control
  Owner cannot see "my controls" or "tests due" without manual filtering. "Satisfies clauses" and
  framework pills compete for the same row width.
- **Target.**
  - `/controls` as a **grouped, view-switchable library**: segment by framework / owner / automation
    (CCM vs manual) / result, with collapsible groups and counts. Summary band: avg
    frameworks/control, mapped to >=2, CCM-automated, failing. SavedViews: "Failing", "CCM",
    "My controls", "Due for re-test". Trim default columns; move framework refs + clause counts into
    an expandable row or the detail. Result and last-tested stay visible (they carry state).
  - **Control Owner dashboard** (Section 9) gives the persona "my controls / tests due / evidence
    gaps" so the library itself is for browsing, not triage.
  - Detail: keep tabs; ensure the "clauses satisfied grouped by act" (Req 5 proof) and test history
    are first-class; "Re-test" becomes a real recorded action (Epic 2.3).

### 8.3 Open Incidents panel / ContextStrip [LEAD]

- **Current.** Fixed 5-vital strip on every screen for every role (Section 5 / code above).
- **Problems.** Not role-relevant; same five numbers everywhere; an always-on incident counter
  reads as alarm fatigue for non-incident personas; duplicates info the dashboards already show.
- **Target.** Replace with the **contextual `NeedsMe` strip** (Section 5): role + screen scoped,
  showing only this persona's current calls to action, with the ambient environment line retained.

### 8.4 Home / Board Cockpit `/`

- **Current.** One cockpit for all: hero, 6 KPIs, heat map + needs-attention, 3 trend charts,
  activity stream. Good content, but it is the Executive view shown to everyone.
- **Target.** Becomes the **`RoleDashboard`** keyed by persona. Executive = current cockpit refined.
  Each other persona gets a composed dashboard from role-relevant cards (Section 9). Keep the heat
  map for EXEC/RISK; replace KPI set per persona.

### 8.5 My Queue `/queue`

- **Current.** Role-aware task list with filter pills; solid.
- **Target.** Keep the model; re-key to 7 personas; tighten row hierarchy (primary action obvious);
  surface counterparty + SLA cleanly. This is the **primary surface for Analyst/Control Owner**.

### 8.6 Risk Register `/risks` + detail

- **Current.** Good register + strong risk-position detail.
- **Target.** Minor: add summary band consistency, SavedViews (by domain/residual), and make this
  the **Risk Manager** landing. Detail is already strong; keep.

### 8.7 Continuous Control Monitoring `/ccm` + detail

- **Current.** Strong: KPIs, rule list, the escalation-chain detail (best thesis page).
- **Target.** Keep; align summary band to the kit; surface "my rules" for Control Owner. Protect the
  marquee failing chain.

### 8.8 Policies `/policies` + detail

- **Current.** Clean list + detail with version history and approval chain.
- **Target.** Minor modernization; make Compliance Manager primary; ensure source provenance card is
  prominent.

### 8.9 Incidents `/incidents` + detail (marquee)

- **Current.** Strong marquee detail with live clocks, timeline, evidence-once.
- **Target.** Keep detail (load-bearing). List gets summary-band + grouping by status/severity. Add
  real per-track "File now" (Epic 3.2). Incident surfaces only for EXEC/CTRLOWNER/AUDITOR.

### 8.10 Regulator Clocks `/clocks`

- **Current.** Three sections of clocks; coherent.
- **Target.** Keep; tighten to summary + grouped countdowns; primary for EXEC/CCO.

### 8.11 Obligations & Calendar `/obligations` + detail

- **Current.** List/calendar toggle, per-regulator chips, maker-checker display, source provenance.
- **Target.** Make internal-vs-external a visible segment; SavedViews (overdue/due-soon/mine);
  wire real Submit->Check->Approve (Epic 2.1) and recurrence (2.2). Primary for CCO/Analyst.

### 8.12 Regulatory Change `/reg-change` + detail

- **Current.** Provenance banner, featured cards, impact table; only 2 changes have rich impact.
- **Target.** Broaden impact links; real acknowledge + owner-alert (Epic 3.1); group by regulator/
  status; impact picture as a clear flow. Primary for CCO/Analyst.

### 8.13 PFRDA Pack `/pfrda`

- **Current.** Sector cockpit with returns, committees, exposure controls, ICS reporting, 6 report
  buttons.
- **Target.** Migrate the 6 buttons into the ReportTemplate kit; keep as the **sector pack** model;
  primary for EXEC/CCO.

### 8.14 DPDP / Data Governance `/dpdp` + DSAR detail

- **Current.** KPIs, DSAR queue with worked case, consent ledger, data inventory; DSAR detail is a
  strong worked erasure-vs-retention case.
- **Target.** Wire DSAR step advancement + audit record (Epic 4.2); group inventory; primary for
  CCO/Analyst.

### 8.15 Audits `/audits` + detail

- **Current.** List + detail with findings->issues.
- **Target.** Make the **Auditor** primary surface; add findings register + remediation status
  reports; real finding/issue close (Epic 3.3).

### 8.16 Issues & Remediation `/issues` + detail

- **Current.** List with bulk-select bar (mock), good source tracing.
- **Target.** Real bulk actions (Epic 3.3); SavedViews (overdue/by-source/mine); primary for
  Control Owner + Auditor.

### 8.17 Evidence Vault `/evidence`

- **Current.** Dense table, no row nav.
- **Target.** Group by capture (auto/manual) / source / framework; summary band; primary for
  Auditor. Add row drill to linked control/obligation.

### 8.18 Integrations `/integrations`

- **Current.** Strong closing diagram + cards.
- **Target.** Keep; make Administrator primary; minor polish.

### 8.19 Settings `/settings`

- **Current.** 9 sections, mostly read-only seeded config + the static audit log.
- **Target.** Becomes the **Administrator** home surface; audit log shows live session events (Epic
  1.3); maker-checker-governed edits framed clearly. Hidden from non-admin personas' nav.

---

## 9. Role dashboards (composition)

Each is a `RoleDashboard` of role-relevant cards. Summary band + 2-3 working cards + a report
shortcut.

- **Executive** - 6 KPI roll-up, risk heat map, exceptions (critical incident + overdue), trends,
  activity, "Export board pack".
- **Risk Manager** - heat map, top residual risks, treatment status, risks-without-controls
  coverage, risk reports.
- **Compliance Manager** - obligation coverage + overdue, approvals waiting (maker-checker),
  clause decisions pending, filing calendar peek, board compliance report.
- **Compliance Analyst** - my queue (filings due), my clause-pipeline work, evidence to attach,
  this-week calendar.
- **Control Owner** - my controls, tests due / overdue, CCM failing among mine, evidence gaps,
  control test summary report.
- **Auditor** - active audits, open findings by age, remediation status, evidence trail shortcuts,
  findings register report.
- **Administrator** - users/roles, frameworks enabled, integrations health, maker-checker rules,
  the live audit log.

---

## 10. Cross-cutting fixes

- Consistent summary band on every list page (kit `SummaryCards`).
- Progressive disclosure on every wide table (grouping/segmenting; trimmed default columns).
- One primary action per surface; demote the rest.
- No em dash in new/rewritten copy (use hyphen or restructure).
- Preserve realism anchors (frozen NOW, roster names, non-round figures, id formats, no empty
  states) and load-bearing fixtures (marquee incident, CCM->issue->incident chain).
- 1024px floor retained.

---

## 11. Open questions / risks for review

1. **Persona vs named-person in the switcher.** Plan adopts personas; the switcher will read e.g.
   "Compliance Manager - Anjali Deshmukh". Confirm that labeling.
2. **Hiding nav items** (vs graying) per persona - confirm hard-hide is acceptable (deep links +
   command search still reach hidden screens).
3. **Default landing per persona** - Executive -> cockpit; others -> their dashboard. Confirm.
4. **DPO and CISO** fold into Compliance and Control Owner personas respectively rather than getting
   their own switcher entries (keeps to the 7). Confirm acceptable.
5. **Scope of "rebuild"** for `/sources` act detail (master-detail) and `/controls` (grouped) - both
   are sizable rewrites; confirm appetite, as planned.

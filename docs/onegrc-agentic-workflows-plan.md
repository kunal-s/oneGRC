# OneGRC — Agentic Workflows Plan (for review)

> **Status: PROPOSAL — not yet built.** This is the plan for item 11. Review and
> adjust scope before implementation. Nothing here is implemented yet.

## Context

The functional spec (§4.2) distinguishes two AI modes:
- **Assistive mode** — answers grounded questions about an open record. **Built** (the OneGRC Copilot panel).
- **Agentic mode** — runs *multi-step work* and returns a *result for a person to approve*: scanning sources for changes, proposing how a clause maps to controls, watching control status and chasing owners, assembling a board pack. **Not built.**

This plan adds Agentic mode while keeping the demo's non-negotiables: **deterministic, grounded, no external model call**, and **nothing changes until a human approves** (maker-checker).

## Design principles

1. **Deterministic & grounded.** Each agent run executes scripted steps over the live *effective* state (seed + session overrides). No model API. Same inputs → same result.
2. **Multi-step & visible.** A run shows its steps executing in sequence (brief staged reveal), then presents a structured **result**: findings + proposed actions.
3. **Approve-to-apply (maker-checker).** The result is a *proposal*. A role-gated user approves it, which performs an **existing** session mutation (e.g. `saveClauseToControl`, `acknowledgeRegChange`, `recordAction`/`notify`). Nothing mutates on run — only on approve.
4. **Auditable.** Each run and each approval writes to the audit log; runs surface as artifacts.

## Surface (one decision to confirm)

- **Option A (recommended): a second tab in the existing Copilot slide-over** — "Ask" | "Agents". Reuses the panel, no new nav, and AI lives in one place. Plus contextual entry points (e.g. on a *Recommended* clause, a "Propose mapping" button runs the mapping agent pre-scoped to that clause).
- **Option B: a dedicated `/agents` route** in the sidebar — more discoverable, but adds nav weight.

## The three runs (focused set — the scope you'll confirm)

| # | Agent run | Steps (visible) | Result → on approve | Demo records |
|---|---|---|---|---|
| 1 | **Source scan** | scan instruments → detect newly-arrived/changed → assess impact | proposes a **regulatory-change** record + owner alert → `acknowledgeRegChange` pipeline | `INST-DPDP-OPS-2026` (commencement), `SRC-EPFO-ECR-2026` (ECR draft), new PT circular from item 1 |
| 2 | **Clause → control mapping** | read clause + penalty/severity → search existing controls → rank best fit vs "create new" | proposes attach-to or create-new → `saveClauseToControl` / `createControlForClause` | `SRC-PT-4` (PT employer deduction) → new "Profession-tax deduction & remittance" control; also `SRC-DPDP-33` |
| 3 | **Owner chase** | scan overdue/at-risk obligations → group by owner → draft reminders + escalation | records reminder actions + owner notifications | overdue duties incl. **`OBL-LAB-JUN26-02`** (Farhan, PT remittance) |

Each run returns a typed `AgentRunResult { steps[], findings[], proposedActions[] }`, where each `proposedAction` carries an `apply()` that maps to an existing store mutation. The **OBL-LAB-JUN26-02** PT case is threaded through runs 2 (map `SRC-PT-4` to its control) and 3 (chase its owner) so the labour/tax tower is part of the agentic demo.

## What gets built

- `src/lib/agents/` — run definitions: deterministic step scripts + result builders reading effective state (mirrors the `copilot/` seam; reuses `buildRecordContext`).
- Store slice — `agentRuns` history (for audit/artifacts) + tab/run UI state; **approval reuses existing mutations**, no new mutation surface.
- UI — the "Agents" tab (Option A) with run cards, staged step reveal, result + per-action **Approve** buttons (role-gated via existing `useCanAct`).
- Audit/artifacts — each run + approval appended to the audit log; run summaries surfaced as artifacts.

## Scope alternatives

- **Minimal (1 run):** mapping only — demonstrates approve-to-apply.
- **Focused (3 runs — recommended):** the table above.
- **Broader (4–5 runs):** + **board-pack assembly** (multi-step aggregate → artifact) and **control-status watch** (find failing/stale controls → propose re-test/issue).

## Verification (when built)

- Each run is deterministic (re-run → identical result); no network/model calls (grep clean).
- Approve performs the real session mutation and writes an audit-log entry; decline leaves state untouched.
- Zero-action baseline unchanged; marquee + CCM chain intact.
- `tsc` + `build` clean.

## Open questions for you

1. Surface: Copilot tab (A) or `/agents` route (B)?
2. Scope: minimal / focused-3 / broader-5?
3. Any specific agent run you want prioritised for the demo beyond the three above?

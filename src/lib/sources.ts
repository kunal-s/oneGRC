// Source & Provenance helpers (Epic 1; normalized + enriched in Epic 15).
// Forward: a record's instrument sources. Reverse (Story 1.2): a source resolves
// to the records that cite it. Epic 15 adds instrument/provision navigation, the
// severity-from-penalty, and the review/approve merge with session overrides.
import { WORLD, getSource, getInstrument } from '@/data'
import { severityFromPenalty } from '@/data/sources'
import type { ReviewState, SourceInstrument, SourceProvision, TriageState } from '@/types'

export { getSource, getInstrument, severityFromPenalty }

export function allSources(): SourceProvision[] {
  return WORLD.sources
}

export function allInstruments(): SourceInstrument[] {
  return WORLD.instruments
}

/** The parent instrument of a provision (by id or object). */
export function instrumentForRef(ref: string | SourceProvision): SourceInstrument | undefined {
  const r = typeof ref === 'string' ? getSource(ref) : ref
  return r ? getInstrument(r.instrumentId) : undefined
}

/** Every provision belonging to an instrument, in seed order. */
export function provisionsForInstrument(instrumentId: string): SourceProvision[] {
  return WORLD.sources.filter((s) => s.instrumentId === instrumentId)
}

/** A display title for a provision: instrument title + provision title. */
export function refDisplayTitle(ref: string | SourceProvision): string {
  const r = typeof ref === 'string' ? getSource(ref) : ref
  if (!r) return typeof ref === 'string' ? ref : ''
  const inst = getInstrument(r.instrumentId)
  return inst ? `${inst.title} — ${r.title}` : r.title
}

/**
 * Reverse lookup — every obligation, policy and control that cites this source.
 * Used by the source viewer's "What this source produced" section.
 */
export function citingRecords(srcId: string): string[] {
  const ids: string[] = []
  for (const o of WORLD.obligations) {
    if (o.sourceRefs?.includes(srcId)) ids.push(o.id)
  }
  for (const p of WORLD.policies) {
    if (p.sourceRefs?.includes(srcId)) ids.push(p.id)
  }
  for (const c of WORLD.controls) {
    if (c.sourceRefs?.includes(srcId) || c.mappedFrameworkRefs.some((m) => m.sourceRef === srcId)) {
      ids.push(c.id)
    }
  }
  return ids
}

// ── Review / approve lifecycle (Epic 15) ────────────────────────────────────
// Session overrides from the Compliance review actions (save-to-controls /
// internal review / specialist). Kept out of the seed so reloads reset (A10).
export interface ProvisionOverride {
  reviewState: ReviewState
  reviewer?: string
  reviewedAt?: string
  rationale?: string
  linkedObligationId?: string
  linkedControlId?: string
}

export type ReviewOverrides = Record<string, ProvisionOverride>

/** A provision merged with any session override. */
export function effectiveProvision(p: SourceProvision, overrides: ReviewOverrides): SourceProvision {
  const o = overrides[p.id]
  return o ? { ...p, ...o } : p
}

/** True when a reviewable provision still needs Compliance attention. */
export function needsAttention(state?: ReviewState): boolean {
  return state !== undefined && state !== 'Approved and saved'
}

/** StatusChip tone for a review state — one consistent chip everywhere. */
export function reviewTone(state: ReviewState): 'ok' | 'warn' | 'danger' | 'info' | 'progress' {
  switch (state) {
    case 'Approved and saved':
      return 'ok'
    case 'Recommended':
      return 'info'
    case 'Under review':
      return 'progress'
    case 'Needs internal review':
      return 'warn'
    case 'Needs specialist':
      return 'danger'
  }
}

export interface InstrumentSummary {
  provisions: number // sections in the instrument
  reviewable: number // sections that carry an applicability review
  needsReview: number // sections still awaiting an approval decision
  approved: number // sections approved and in action
}

/** Per-instrument rollup for the Source Library list, honouring overrides. */
export function instrumentSummary(instrumentId: string, overrides: ReviewOverrides): InstrumentSummary {
  const provisions = provisionsForInstrument(instrumentId)
  let reviewable = 0
  let needsReview = 0
  let approved = 0
  for (const p of provisions) {
    const eff = effectiveProvision(p, overrides)
    if (!eff.reviewState) continue
    reviewable++
    if (eff.reviewState === 'Approved and saved') approved++
    else if (needsAttention(eff.reviewState)) needsReview++
  }
  return { provisions: provisions.length, reviewable, needsReview, approved }
}

// ── Compliance Intake (Epic 14) ─────────────────────────────────────────────
// Session overrides on a circular's triage state (reset on reload, A10).
export type IntakeOverrides = Record<string, { triageState: TriageState; parkedReason?: string }>

/** Every instrument that arrived via Compliance Intake (has inflow metadata). */
export function intakeInstruments(): SourceInstrument[] {
  return WORLD.instruments.filter((i) => i.intake)
}

/** A circular's triage state merged with any session override. */
export function effectiveTriage(inst: SourceInstrument, overrides: IntakeOverrides): TriageState | undefined {
  if (!inst.intake) return undefined
  return overrides[inst.id]?.triageState ?? inst.intake.triageState
}

/** Accepted into the live register — triage done. */
export function isResolvedTriage(state?: TriageState): boolean {
  return state === 'Accepted' || state === 'Live'
}

/** Still awaiting a triage decision (not resolved, not parked). */
export function awaitingTriage(state?: TriageState): boolean {
  return state !== undefined && !isResolvedTriage(state) && state !== 'Parked'
}

/** StatusChip tone for a triage state. */
export function triageTone(state: TriageState): 'ok' | 'warn' | 'danger' | 'info' | 'progress' | 'neutral' {
  switch (state) {
    case 'Accepted':
    case 'Live':
      return 'ok'
    case 'Parsed':
      return 'info'
    case 'Pulled':
    case 'Uploaded':
    case 'Under triage':
      return 'progress'
    case 'Needs internal review':
      return 'warn'
    case 'Needs external specialist':
      return 'danger'
    case 'Parked':
      return 'neutral'
  }
}

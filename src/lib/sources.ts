// Source & Provenance helpers (Epic 1; normalized in Epic 15).
// Forward: a record's instrument sources. Reverse (Story 1.2): a source resolves
// to the records that cite it. Epic 15 adds instrument/provision navigation and
// the applicability-review merge with session overrides.
import { WORLD, getSource, getInstrument } from '@/data'
import type { ApplicabilityReview, ReviewState, SourceInstrument, SourceReference } from '@/types'

export { getSource, getInstrument }

export function allSources(): SourceReference[] {
  return WORLD.sources
}

export function allInstruments(): SourceInstrument[] {
  return WORLD.instruments
}

/** The parent instrument of a provision (by id or object). */
export function instrumentForRef(ref: string | SourceReference): SourceInstrument | undefined {
  const r = typeof ref === 'string' ? getSource(ref) : ref
  return r ? getInstrument(r.instrumentId) : undefined
}

/** Every provision belonging to an instrument, in seed order. */
export function provisionsForInstrument(instrumentId: string): SourceReference[] {
  return WORLD.sources.filter((s) => s.instrumentId === instrumentId)
}

/** A display title for a provision: instrument title + provision title. */
export function refDisplayTitle(ref: string | SourceReference): string {
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

// ── Applicability review (Epic 15) ──────────────────────────────────────────
// Session overrides from the Compliance review actions (confirm / not-applicable
// / expert / internal). Kept out of the seed so reloads reset (A10).
export interface ReviewOverride {
  reviewState: ReviewState
  reviewer?: string
  reviewedAt?: string
  rationale?: string
}

export type ReviewOverrides = Record<string, ReviewOverride>

/** The seed review merged with any session override. */
export function effectiveReview(
  ref: SourceReference,
  overrides: ReviewOverrides,
): ApplicabilityReview | undefined {
  if (!ref.review) return undefined
  const o = overrides[ref.id]
  return o ? { ...ref.review, ...o } : ref.review
}

/** True when a provision's review still needs Compliance attention. */
export function needsAttention(state: ReviewState): boolean {
  return state === 'Recommended' || state === 'Needs expert opinion' || state === 'Under internal review'
}

export interface InstrumentSummary {
  provisions: number
  obligations: number // unique across this instrument's provisions
  needsReview: number // provisions still awaiting a Compliance decision
  needsExpert: number // provisions flagged for expert opinion
}

/** Per-instrument rollup for the Source Library list, honouring overrides. */
export function instrumentSummary(instrumentId: string, overrides: ReviewOverrides): InstrumentSummary {
  const provisions = provisionsForInstrument(instrumentId)
  const obligationIds = new Set<string>()
  let needsReview = 0
  let needsExpert = 0
  for (const p of provisions) {
    const r = effectiveReview(p, overrides)
    if (!r) continue
    for (const oid of r.recommendedObligationIds) obligationIds.add(oid)
    if (needsAttention(r.reviewState)) needsReview++
    if (r.reviewState === 'Needs expert opinion') needsExpert++
  }
  return { provisions: provisions.length, obligations: obligationIds.size, needsReview, needsExpert }
}

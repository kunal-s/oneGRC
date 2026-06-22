import { useApp } from '@/store'
import { WORLD, getObligation, getControl, getIssue, getIncident, getRegChange, getDsar } from '@/data'
import type { Obligation, Control, Issue, Incident, RegulatoryChange, Dsar } from '@/types'

/**
 * The generalised merge-on-read layer (Epic 1.1), mirroring effectiveClause for
 * the Sources pipeline. A record's effective state is its seed merged with any
 * session override (overrides win). The seed is never mutated; reload resets all
 * overrides. Every mutable page reads through these so the cockpit and the detail
 * can never disagree. Rule: overrides change fields, never remove or re-key.
 */
export const effectiveObligation = (o: Obligation, ov?: Partial<Obligation>): Obligation => (ov ? { ...o, ...ov } : o)
export const effectiveControl = (c: Control, ov?: Partial<Control>): Control => (ov ? { ...c, ...ov } : c)
export const effectiveIssue = (i: Issue, ov?: Partial<Issue>): Issue => (ov ? { ...i, ...ov } : i)
export const effectiveIncident = (i: Incident, ov?: Partial<Incident>): Incident => (ov ? { ...i, ...ov } : i)
export const effectiveRegChange = (r: RegulatoryChange, ov?: Partial<RegulatoryChange>): RegulatoryChange => (ov ? { ...r, ...ov } : r)
export const effectiveDsar = (d: Dsar, ov?: Partial<Dsar>): Dsar => (ov ? { ...d, ...ov } : d)

// ── Single-record hooks (replace getX(id) reads on mutable pages) ─────────────

export function useEffectiveObligation(id: string): Obligation | undefined {
  const ov = useApp((s) => s.obligationOverrides[id])
  const session = useApp((s) => s.sessionObligations.find((x) => x.id === id))
  const base = getObligation(id)
  return base ? effectiveObligation(base, ov) : session
}

export function useEffectiveControl(id: string): Control | undefined {
  const ov = useApp((s) => s.controlOverrides[id])
  const session = useApp((s) => s.getSessionControl(id))
  const base = getControl(id)
  return base ? effectiveControl(base, ov) : session
}

export function useEffectiveIssue(id: string): Issue | undefined {
  const ov = useApp((s) => s.issueOverrides[id])
  const base = getIssue(id)
  return base ? effectiveIssue(base, ov) : undefined
}

export function useEffectiveIncident(id: string): Incident | undefined {
  const ov = useApp((s) => s.incidentOverrides[id])
  const base = getIncident(id)
  return base ? effectiveIncident(base, ov) : undefined
}

export function useEffectiveRegChange(id: string): RegulatoryChange | undefined {
  const ov = useApp((s) => s.regChangeOverrides[id])
  const base = getRegChange(id)
  return base ? effectiveRegChange(base, ov) : undefined
}

export function useEffectiveDsar(id: string): Dsar | undefined {
  const ov = useApp((s) => s.dsarOverrides[id])
  const base = getDsar(id)
  return base ? effectiveDsar(base, ov) : undefined
}

// ── List hooks (replace WORLD.x reads on mutable list pages) ──────────────────

export function useEffectiveObligations(): Obligation[] {
  const ov = useApp((s) => s.obligationOverrides)
  const session = useApp((s) => s.sessionObligations)
  return [...WORLD.obligations.map((o) => effectiveObligation(o, ov[o.id])), ...session]
}

export function useEffectiveControls(): Control[] {
  const ov = useApp((s) => s.controlOverrides)
  const session = useApp((s) => s.sessionControls)
  return [...WORLD.controls.map((c) => effectiveControl(c, ov[c.id])), ...session]
}

export function useEffectiveIssues(): Issue[] {
  const ov = useApp((s) => s.issueOverrides)
  return WORLD.issues.map((i) => effectiveIssue(i, ov[i.id]))
}

export function useEffectiveIncidents(): Incident[] {
  const ov = useApp((s) => s.incidentOverrides)
  return WORLD.incidents.map((i) => effectiveIncident(i, ov[i.id]))
}

export function useEffectiveRegChanges(): RegulatoryChange[] {
  const ov = useApp((s) => s.regChangeOverrides)
  return WORLD.regChanges.map((r) => effectiveRegChange(r, ov[r.id]))
}

export function useEffectiveDsars(): Dsar[] {
  const ov = useApp((s) => s.dsarOverrides)
  return WORLD.dsars.map((d) => effectiveDsar(d, ov[d.id]))
}

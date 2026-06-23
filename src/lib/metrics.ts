import { useApp } from '@/store'
import { WORLD, METRICS } from '@/data'
import type { Obligation, Control, Issue, Incident } from '@/types'
import { effectiveObligation, effectiveControl, effectiveIncident, effectiveFinding } from './effective'

/**
 * Headline metrics recomputed from effective (seed + override) state, so a session
 * action visibly moves the cockpit numbers (Req 14). Baseline-plus-delta by design:
 * only the measures an in-scope action can move are recomputed; board aggregates
 * that no action touches (enterprise risk, AUM, subscribers, reg-update count) stay
 * frozen. With zero overrides this returns numbers identical to the seed METRICS -
 * that equivalence is the regression guard.
 */
export interface EffectiveMetrics {
  enterpriseRisk: number
  enterpriseRiskTrend: 'up' | 'down' | 'flat'
  controlCoverage: number
  ccmAutomated: number
  openIncidents: number
  criticalOpen: number
  overdueObligations: number
  dueSoonObligations: number
  openFindings: number
  aumCrore: number
  subscribers: number
  regUpdates2025: number
}

export function effectiveMetrics(maps: {
  obligationOverrides: Record<string, Partial<Obligation>>
  controlOverrides: Record<string, Partial<Control>>
  issueOverrides: Record<string, Partial<Issue>>
  incidentOverrides: Record<string, Partial<Incident>>
  sessionObligations: Obligation[]
}): EffectiveMetrics {
  // Controls: recompute over the canonical population (WORLD.controls, the seed
  // METRICS denominator) so coverage stays exactly 96.2% when nothing changed.
  const controls = WORLD.controls.map((c) => effectiveControl(c, maps.controlOverrides[c.id]))
  const passOrPartial = controls.filter((c) => c.result !== 'Fail').length
  const controlCoverage = (passOrPartial / controls.length) * 100
  const ccmAutomated = controls.filter((c) => c.automation === 'CCM').length

  // Obligations: include session-scheduled recurring instances.
  const obligations = [
    ...WORLD.obligations.map((o) => effectiveObligation(o, maps.obligationOverrides[o.id])),
    ...maps.sessionObligations,
  ]
  const overdueObligations = obligations.filter((o) => o.status === 'Overdue').length
  const dueSoonObligations = obligations.filter((o) => o.status === 'Due').length

  // Incidents.
  const openIncidents = WORLD.incidents
    .map((i) => effectiveIncident(i, maps.incidentOverrides[i.id]))
    .filter((i) => i.status !== 'Closed')
  const criticalOpen = openIncidents.filter((i) => i.classification === 'Critical').length

  // Open findings: counted straight off the effective findings (a finding reads
  // Closed once its 1:1 remediation issue is Resolved). Single source of truth, so
  // it can never disagree with the audit screens, and resolving an audit-finding
  // issue that is NOT linked to an open finding correctly leaves it unchanged. With
  // zero overrides the seed is internally consistent, so this equals METRICS (27).
  const openFindings = WORLD.audits
    .flatMap((a) => a.findings)
    .filter((f) => effectiveFinding(f, maps.issueOverrides).status !== 'Closed').length

  return {
    enterpriseRisk: METRICS.enterpriseRisk,
    enterpriseRiskTrend: METRICS.enterpriseRiskTrend,
    controlCoverage,
    ccmAutomated,
    openIncidents: openIncidents.length,
    criticalOpen,
    overdueObligations,
    dueSoonObligations,
    openFindings,
    aumCrore: METRICS.aumCrore,
    subscribers: METRICS.subscribers,
    regUpdates2025: METRICS.regUpdates2025,
  }
}

/** Reactive effective metrics for cockpit / strips. */
export function useEffectiveMetrics(): EffectiveMetrics {
  const obligationOverrides = useApp((s) => s.obligationOverrides)
  const controlOverrides = useApp((s) => s.controlOverrides)
  const issueOverrides = useApp((s) => s.issueOverrides)
  const incidentOverrides = useApp((s) => s.incidentOverrides)
  const sessionObligations = useApp((s) => s.sessionObligations)
  return effectiveMetrics({ obligationOverrides, controlOverrides, issueOverrides, incidentOverrides, sessionObligations })
}

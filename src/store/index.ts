import { create } from 'zustand'
import type {
  Control, RoleKey, Obligation, Issue, Incident, RegulatoryChange, Dsar, Evidence,
} from '@/types'
import { ROLES } from '@/data/people'
import { WORLD, getSource, getObligation, getControl, getRegChange, getIncident, getIssue, getAudit, getDsar, getInstrument, getEvidence, MARQUEE } from '@/data'
import { provisionsForInstrument } from '@/lib/sources'
import { dsarTotalSteps } from '@/lib/dsar'
import { personName } from '@/data/people'
import { nextInstance } from '@/lib/recurrence'
import { escalationSeedNotifications } from '@/lib/reminders'
import type { TaskWorkflow } from '@/lib/tasks'

/** A recorded control test (Epic 2.3). Session re-tests prepend to the seeded history. */
export interface TestRun {
  at: string // ISO
  result: 'Pass' | 'Fail' | 'Partial'
  method: string
  tester: string // person id
  note: string
}
import type { ClauseOverride, ClauseOverrides } from '@/lib/sources'
import { NOW, minsFromNow } from '@/lib/time'

/**
 * Tamper-evident session audit log entry (Epic 1.3). Every typed workflow action
 * appends one via recordAction; the Settings audit log shows these alongside the
 * seeded history. Append-only; resets on reload.
 */
export interface AuditEntry {
  id: string
  at: string // ISO
  actor: string // person id or 'system'
  action: string
  entityId?: string
  route?: string
  detail?: string
}

/** A user notification (Epic 1.3). Seeded baseline + session appends. */
export interface NotificationItem {
  id: string
  at: string // ISO
  title: string
  body?: string
  severity: 'info' | 'warn' | 'critical'
  entityId?: string
  route?: string
  read: boolean
}

// A small seeded baseline so the notification bell is never empty (no empty
// states). Timestamps derive from the frozen NOW. Session events prepend.
// The most recent fired escalations (E0.2) are folded in so the bell reflects the
// reminder/escalation engine, not just static items.
const SEED_NOTIFICATIONS: NotificationItem[] = [
  ...escalationSeedNotifications(3).map((n, i) => ({ ...n, id: `NTF-esc-${i + 1}`, read: false })),
  { id: 'NTF-seed-1', at: minsFromNow(-8), title: 'CERT-In 6-hour clock at risk', body: 'INC-2026-0411 Annexure I awaiting sign-off.', severity: 'critical', entityId: 'INC-2026-0411', route: '/incidents/INC-2026-0411', read: false },
  { id: 'NTF-seed-2', at: minsFromNow(-41), title: 'Patch-SLA CCM rule failing', body: '3 critical CVEs past the 14-day window.', severity: 'warn', entityId: 'CTRL-PCI-6.3.3', route: '/ccm', read: false },
  { id: 'NTF-seed-3', at: minsFromNow(-126), title: 'GSTR-3B Table 4 change ingested', body: 'Reg-change RCM-2026-118 impacts the monthly GST return.', severity: 'warn', entityId: 'RCM-2026-118', route: '/reg-change/RCM-2026-118', read: false },
  { id: 'NTF-seed-4', at: minsFromNow(-205), title: '9 obligations overdue', body: 'Remediation plan pending approval.', severity: 'info', entityId: undefined, route: '/obligations', read: true },
]

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'info' | 'critical'
}

export interface DrawerState {
  open: boolean
  kind: 'cert-in-report' | 'pfrda-notify' | 'dpdp-track' | 'evidence-upload' | 'export-pdf' | 'source-viewer' | 'generic' | null
  title?: string
  payload?: unknown
}

/**
 * Session-held artifact model (design seam — Epic 1; UI wired in Epic 10).
 * Generated templates and uploaded evidence live here in-memory and reset on
 * reload — no persistence, no backend.
 */
export interface Artifact {
  id: string
  kind: 'template' | 'evidence' | 'report'
  title: string
  createdAt: string // ISO
  payload?: unknown
}

interface AppState {
  role: RoleKey
  setRole: (role: RoleKey) => void
  currentPersonId: () => string

  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void

  drawer: DrawerState
  openDrawer: (d: Omit<DrawerState, 'open'>) => void
  closeDrawer: () => void

  commandOpen: boolean
  setCommandOpen: (v: boolean) => void

  copilotOpen: boolean
  setCopilotOpen: (v: boolean) => void

  artifacts: Artifact[]
  addArtifact: (a: Omit<Artifact, 'id'>) => string
  getArtifact: (id: string) => Artifact | undefined

  // Sources pipeline (act → clause → control) — session overrides on a clause's
  // status/applicability, and the session controls minted by "create new".
  clauseOverrides: ClauseOverrides
  sessionControls: Control[]
  getSessionControl: (id: string) => Control | undefined
  // Save a clause to an existing control — adds it to that control's Satisfies.
  saveClauseToControl: (provisionId: string, controlId: string) => void
  // Create a new control from a clause and save the clause to it. Returns the id.
  createControlForClause: (provisionId: string, c: { title: string; owner: string; frequency: string; nextDue?: string; description?: string }) => string
  // Route an unclear clause to an external specialist for an interpretation.
  engageSpecialist: (provisionId: string) => void
  // Record the specialist's outcome so Save is enabled.
  completeSpecialist: (provisionId: string, note: string) => void
  // Officer override of applicability (applicable / not applicable).
  setClauseApplicability: (provisionId: string, applicable: boolean, basis?: string) => void

  // ── Generalised session-mutation layer (Epic 1.1) ───────────────────────────
  // Each slice holds per-id partial overrides merged over the seed on read via
  // src/lib/effective.ts. Pipeline/workflow actions write here only; the seed is
  // never mutated, so a reload restores the pristine demo. Typed workflow actions
  // (submit/approve/re-test/...) live in their epics and call these patchers.
  obligationOverrides: Record<string, Partial<Obligation>>
  controlOverrides: Record<string, Partial<Control>>
  issueOverrides: Record<string, Partial<Issue>>
  incidentOverrides: Record<string, Partial<Incident>>
  regChangeOverrides: Record<string, Partial<RegulatoryChange>>
  dsarOverrides: Record<string, Partial<Dsar>>
  // Session-appended recurring obligation instances (Epic 2.2 schedules these).
  sessionObligations: Obligation[]
  // Session-registered regulatory changes (a new circular / version on an Act).
  sessionRegChanges: RegulatoryChange[]
  addInstrumentChange: (instrumentId: string, kind: 'Circular' | 'New version', title: string) => string

  patchObligation: (id: string, patch: Partial<Obligation>) => void
  patchControl: (id: string, patch: Partial<Control>) => void
  patchIssue: (id: string, patch: Partial<Issue>) => void
  patchIncident: (id: string, patch: Partial<Incident>) => void
  patchRegChange: (id: string, patch: Partial<RegulatoryChange>) => void
  patchDsar: (id: string, patch: Partial<Dsar>) => void
  addSessionObligation: (o: Obligation) => void

  // ── Governance primitives (Epic 1.3) ────────────────────────────────────────
  auditLog: AuditEntry[]
  notifications: NotificationItem[]
  recordAction: (e: Omit<AuditEntry, 'id' | 'at' | 'actor'> & { actor?: string }) => void
  notify: (n: Omit<NotificationItem, 'id' | 'at' | 'read'>) => void
  markNotificationsRead: () => void

  // ── Task two-step maker-checker (E0.3 maker / E0.4 checker) ──────────────────
  // The maker creates+links an Evidence record; a DIFFERENT checker verifies it.
  // Each step records its actor + timestamp; session-only, merged on read.
  sessionEvidence: Evidence[]
  taskWorkflow: Record<string, TaskWorkflow> // tskId -> { evidenceId, maker, makerAt, checker, checkerAt }
  getAnyEvidence: (id: string) => Evidence | undefined
  attachTaskEvidence: (args: { taskId: string; obligationId: string; controlId?: string; title: string; type: Evidence['type'] }) => string
  verifyTask: (args: { taskId: string; obligationId: string }) => void

  // ── Obligation workflow (Epic 2.1) ──────────────────────────────────────────
  // Maker submits, a different checker approves; status advances via overrides and
  // the action is written to the audit log + notifications. On approval the next
  // recurring instance is scheduled (Epic 2.2).
  submitObligation: (id: string) => void
  approveObligation: (id: string) => void

  // ── Control test/re-test (Epic 2.3) ─────────────────────────────────────────
  controlTests: Record<string, TestRun[]>
  retestControl: (id: string, opts?: { result?: TestRun['result']; method?: string; note?: string }) => void

  // ── Regulatory change (Epic 3.1) ────────────────────────────────────────────
  acknowledgeRegChange: (id: string) => void

  // ── Incident regulator-track filing (Epic 3.2) ──────────────────────────────
  fileIncidentTrack: (incidentId: string, trackIndex: number) => void

  // ── Issue remediation + audit findings (Epic 3.3) ───────────────────────────
  resolveIssue: (id: string) => void
  bulkSetIssueStatus: (ids: string[], status: Issue['status']) => void
  closeFinding: (auditId: string, findingId: string) => void

  // ── DSAR erasure-vs-retention workflow (Epic 4.2) ───────────────────────────
  advanceDsar: (id: string) => void
  flagDsarBreach: (id: string) => void
}

let toastSeq = 0
let artifactSeq = 0
let sessionControlSeq = 0
let auditSeq = 0
let notifSeq = 0
let regChangeSeq = 0
let evidenceSeq = 0

export const useApp = create<AppState>((set, get) => ({
  role: 'EXEC',
  setRole: (role) => set({ role }),
  currentPersonId: () => ROLES.find((r) => r.key === get().role)?.person ?? 'meera',

  toasts: [],
  pushToast: (t) => {
    const id = `toast-${++toastSeq}`
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, 4200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  drawer: { open: false, kind: null },
  openDrawer: (d) => set({ drawer: { ...d, open: true } }),
  closeDrawer: () => set((s) => ({ drawer: { ...s.drawer, open: false } })),

  commandOpen: false,
  setCommandOpen: (v) => set({ commandOpen: v }),

  copilotOpen: false,
  setCopilotOpen: (v) => set({ copilotOpen: v }),

  artifacts: [],
  addArtifact: (a) => {
    const id = `ART-${++artifactSeq}`
    set((s) => ({ artifacts: [...s.artifacts, { ...a, id }] }))
    return id
  },
  getArtifact: (id) => get().artifacts.find((x) => x.id === id),

  clauseOverrides: {},
  sessionControls: [],
  getSessionControl: (id) => get().sessionControls.find((c) => c.id === id),

  saveClauseToControl: (provisionId, controlId) => {
    const reviewer = ROLES.find((r) => r.key === get().role)?.person ?? 'anjali'
    const prev = get().clauseOverrides[provisionId] ?? {}
    const merged: ClauseOverride = { ...prev, status: 'Saved', linkedControlId: controlId, reviewer, reviewedAt: NOW.toISOString() }
    set((s) => ({ clauseOverrides: { ...s.clauseOverrides, [provisionId]: merged } }))
  },
  createControlForClause: (provisionId, c) => {
    const id = `CTRL-COMP-NEW-${String(++sessionControlSeq).padStart(3, '0')}`
    const control: Control = {
      id,
      title: c.title,
      frameworks: [],
      mappedFrameworkRefs: [],
      owner: c.owner,
      type: 'Preventive',
      automation: 'Manual',
      lastTested: NOW.toISOString(),
      result: 'Pass',
      evidenceCount: 0,
      linkedRisks: [],
      linkedIssues: [],
      description: c.description ?? c.title,
      frequency: c.frequency,
      nextDue: c.nextDue,
      sourceRefs: getSource(provisionId) ? [provisionId] : [],
    }
    set((s) => ({ sessionControls: [...s.sessionControls, control] }))
    get().saveClauseToControl(provisionId, id)
    return id
  },
  engageSpecialist: (provisionId) => {
    const reviewer = ROLES.find((r) => r.key === get().role)?.person ?? 'anjali'
    const prev = get().clauseOverrides[provisionId] ?? {}
    const merged: ClauseOverride = { ...prev, status: 'Specialist review', reviewer, reviewedAt: NOW.toISOString() }
    set((s) => ({ clauseOverrides: { ...s.clauseOverrides, [provisionId]: merged } }))
  },
  completeSpecialist: (provisionId, note) => {
    const prev = get().clauseOverrides[provisionId] ?? {}
    set((s) => ({ clauseOverrides: { ...s.clauseOverrides, [provisionId]: { ...prev, specialistNote: note } } }))
  },
  setClauseApplicability: (provisionId, applicable, basis) => {
    const prev = get().clauseOverrides[provisionId] ?? {}
    const merged: ClauseOverride = { ...prev, applicable, applicabilityBasis: basis, status: applicable ? prev.status : 'Not applicable' }
    set((s) => ({ clauseOverrides: { ...s.clauseOverrides, [provisionId]: merged } }))
  },

  // ── Generalised session-mutation layer (Epic 1.1) ───────────────────────────
  obligationOverrides: {},
  controlOverrides: {},
  issueOverrides: {},
  incidentOverrides: {},
  regChangeOverrides: {},
  dsarOverrides: {},
  sessionObligations: [],

  patchObligation: (id, patch) =>
    set((s) => ({ obligationOverrides: { ...s.obligationOverrides, [id]: { ...s.obligationOverrides[id], ...patch } } })),
  patchControl: (id, patch) =>
    set((s) => ({ controlOverrides: { ...s.controlOverrides, [id]: { ...s.controlOverrides[id], ...patch } } })),
  patchIssue: (id, patch) =>
    set((s) => ({ issueOverrides: { ...s.issueOverrides, [id]: { ...s.issueOverrides[id], ...patch } } })),
  patchIncident: (id, patch) =>
    set((s) => ({ incidentOverrides: { ...s.incidentOverrides, [id]: { ...s.incidentOverrides[id], ...patch } } })),
  patchRegChange: (id, patch) =>
    set((s) => ({ regChangeOverrides: { ...s.regChangeOverrides, [id]: { ...s.regChangeOverrides[id], ...patch } } })),
  patchDsar: (id, patch) =>
    set((s) => ({ dsarOverrides: { ...s.dsarOverrides, [id]: { ...s.dsarOverrides[id], ...patch } } })),
  addSessionObligation: (o) => set((s) => ({ sessionObligations: [...s.sessionObligations, o] })),

  // ── Add a circular / new version to an existing Act (Item 1) ────────────────
  // Registers a regulatory change against the instrument, flags the records its
  // clauses produced, alerts the owner, and routes into the Reg-Change pipeline
  // (assess → acknowledge). Session-only; never mutates the seed.
  sessionRegChanges: [],
  addInstrumentChange: (instrumentId, kind, title) => {
    const inst = getInstrument(instrumentId)
    if (!inst) return ''
    const regulator: RegulatoryChange['regulator'] = inst.regulator ?? 'Companies Act'
    const provs = provisionsForInstrument(instrumentId)
    const provIds = provs.map((p) => p.id)
    const cites = (refs?: string[]) => (refs ?? []).some((r) => provIds.includes(r))
    const impactedObligations = WORLD.obligations.filter((o) => cites(o.sourceRefs)).map((o) => o.id).slice(0, 8)
    // Controls connect to a clause either by sourceRefs (state-tax style) or by the
    // clause's linkedControlId (the saved-to-control link, e.g. DPDP -> DPB/SEC).
    const linkedCtrls = provs.map((p) => p.linkedControlId).filter((x): x is string => Boolean(x))
    const impactedControls = Array.from(new Set([...WORLD.controls.filter((c) => cites(c.sourceRefs)).map((c) => c.id), ...linkedCtrls])).slice(0, 8)
    const owner = getObligation(impactedObligations[0] ?? '')?.owner ?? 'anjali'
    const id = `RCM-2026-S${String(++regChangeSeq).padStart(2, '0')}`
    const rc: RegulatoryChange = {
      id,
      source: regulator === 'PFRDA' ? 'PFRDA circular' : 'Regulatory Intelligence feed',
      summary: title,
      regulator,
      publishedAt: NOW.toISOString(),
      impactedObligations,
      impactedControls,
      owner,
      status: 'In progress',
      detail: `${kind} registered against ${inst.title}. ${impactedObligations.length} obligation(s) and ${impactedControls.length} control(s) flagged for review; owner ${personName(owner)} alerted to assess and acknowledge.`,
      instrumentId,
    }
    set((s) => ({ sessionRegChanges: [...s.sessionRegChanges, rc] }))
    get().recordAction({ action: `Registered ${kind.toLowerCase()} on ${inst.title}`, entityId: id, route: `/reg-change/${id}`, detail: title })
    get().notify({ title: `${kind} registered`, body: `${id} - ${personName(owner)} alerted; ${impactedObligations.length} obligation(s) and ${impactedControls.length} control(s) to review.`, severity: 'warn', entityId: id, route: `/reg-change/${id}` })
    return id
  },

  // ── Governance primitives (Epic 1.3) ────────────────────────────────────────
  auditLog: [],
  notifications: SEED_NOTIFICATIONS,
  recordAction: (e) => {
    const actor = e.actor ?? get().currentPersonId()
    const entry: AuditEntry = { ...e, actor, id: `ALOG-S-${++auditSeq}`, at: NOW.toISOString() }
    set((s) => ({ auditLog: [entry, ...s.auditLog] }))
  },
  notify: (n) => {
    const item: NotificationItem = { ...n, id: `NTF-${++notifSeq}`, at: NOW.toISOString(), read: false }
    set((s) => ({ notifications: [item, ...s.notifications] }))
  },
  markNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  // ── Task two-step maker-checker (E0.3 maker / E0.4 checker) ──────────────────
  sessionEvidence: [],
  taskWorkflow: {},
  getAnyEvidence: (id) => getEvidence(id) ?? get().sessionEvidence.find((e) => e.id === id),
  attachTaskEvidence: ({ taskId, obligationId, controlId, title, type }) => {
    const actor = get().currentPersonId()
    const id = `EVD-S-${String(++evidenceSeq).padStart(3, '0')}`
    const rec: Evidence = {
      id,
      title,
      type,
      capturedAt: NOW.toISOString(),
      capturedBy: actor,
      auto: false,
      linkedControls: controlId ? [controlId] : [],
      linkedObligations: [obligationId],
      frameworkRefs: [],
      source: 'Manual upload',
    }
    set((s) => ({
      sessionEvidence: [...s.sessionEvidence, rec],
      // Maker step: record the actor + timestamp alongside the evidence link.
      taskWorkflow: { ...s.taskWorkflow, [taskId]: { ...s.taskWorkflow[taskId], evidenceId: id, maker: actor, makerAt: NOW.toISOString() } },
    }))
    // Reflect the proof on the obligation record too (closes the evidence gap).
    const base = getObligation(obligationId) ?? get().sessionObligations.find((o) => o.id === obligationId)
    const curEv = get().obligationOverrides[obligationId]?.evidence ?? base?.evidence ?? []
    get().patchObligation(obligationId, { evidence: [...curEv, id] })
    get().recordAction({ action: `Maker attached evidence to ${taskId}`, entityId: id, route: `/tasks/${taskId}`, detail: `${title} — linked to ${obligationId}${controlId ? ` and ${controlId}` : ''}` })
    get().notify({ title: 'Evidence attached', body: `${id} linked to task ${taskId}; awaiting checker verification.`, severity: 'info', entityId: obligationId, route: `/tasks/${taskId}` })
    return id
  },
  // Checker step: a different person verifies the maker's evidence. The action is
  // recorded with actor + timestamp; the task then reads Done. Two steps only.
  verifyTask: ({ taskId, obligationId }) => {
    const actor = get().currentPersonId()
    const prev = get().taskWorkflow[taskId]
    if (!prev?.evidenceId) return // nothing to verify until the maker has attached
    if (prev.checkerAt) return // already verified
    if (actor === prev.maker) return // separation of duties — the attacher cannot verify
    set((s) => ({ taskWorkflow: { ...s.taskWorkflow, [taskId]: { ...prev, checker: actor, checkerAt: NOW.toISOString() } } }))
    get().recordAction({ action: `Checker verified ${taskId}`, entityId: prev.evidenceId, route: `/tasks/${taskId}`, detail: `Verified evidence ${prev.evidenceId} on ${obligationId}` })
    get().notify({ title: 'Task verified', body: `${taskId} verified by the checker; evidence ${prev.evidenceId} accepted.`, severity: 'info', entityId: obligationId, route: `/tasks/${taskId}` })
  },

  // ── Obligation workflow (Epic 2.1) ──────────────────────────────────────────
  submitObligation: (id) => {
    const base = getObligation(id) ?? get().sessionObligations.find((o) => o.id === id)
    if (!base) return
    const mc = { ...base.makerChecker, ...(get().obligationOverrides[id]?.makerChecker ?? {}) }
    get().patchObligation(id, { status: 'In review', makerChecker: { ...mc, state: 'Submitted' } })
    get().recordAction({ action: `Submitted obligation ${id} for check`, entityId: id, route: `/obligations/${id}`, detail: base.title })
    get().notify({ title: 'Filing submitted for check', body: `${id} - ${base.title}`, severity: 'info', entityId: id, route: `/obligations/${id}` })
  },
  approveObligation: (id) => {
    const base = getObligation(id) ?? get().sessionObligations.find((o) => o.id === id)
    if (!base) return
    const mc = { ...base.makerChecker, ...(get().obligationOverrides[id]?.makerChecker ?? {}) }
    get().patchObligation(id, { status: 'Filed', makerChecker: { ...mc, state: 'Approved' } })
    get().recordAction({ action: `Approved & filed obligation ${id}`, entityId: id, route: `/obligations/${id}`, detail: base.title })
    get().notify({ title: 'Obligation filed', body: `${id} - ${base.title} approved under maker-checker.`, severity: 'info', entityId: id, route: `/obligations/${id}` })
    // Schedule the next recurring instance (spec 5.4) as a session-appended duty.
    const merged = { ...base, ...(get().obligationOverrides[id] ?? {}), status: 'Filed' as const }
    const next = nextInstance(merged)
    if (next) {
      get().addSessionObligation(next)
      get().recordAction({ action: `Scheduled next ${next.frequency.toLowerCase()} cycle ${next.id}`, entityId: next.id, route: `/obligations/${next.id}`, detail: next.title })
      get().notify({ title: 'Next cycle scheduled', body: `${next.id} - ${next.title} is now due ${new Date(next.dueDate).toLocaleDateString('en-IN')}.`, severity: 'info', entityId: next.id, route: `/obligations/${next.id}` })
    }
  },

  // ── Control test/re-test (Epic 2.3) ─────────────────────────────────────────
  controlTests: {},
  retestControl: (id, opts) => {
    const base = getControl(id) ?? get().getSessionControl(id)
    if (!base) return
    // Protect the load-bearing marquee CCM chain: a re-test of the patch-SLA
    // control records remediation-in-progress (Partial), not a clean Pass, so the
    // failing CCM rule -> issue -> incident story survives.
    const marquee = id === 'CTRL-PCI-6.3.3'
    const result = opts?.result ?? (marquee ? 'Partial' : 'Pass')
    const tester = get().currentPersonId()
    const run: TestRun = {
      at: NOW.toISOString(),
      result,
      method: opts?.method ?? 'Manual re-test',
      tester,
      note: opts?.note ?? (marquee ? 'Re-tested; patch remediation in progress, critical CVEs being closed.' : 'Re-tested and operating effectively.'),
    }
    set((s) => ({ controlTests: { ...s.controlTests, [id]: [run, ...(s.controlTests[id] ?? [])] } }))
    get().patchControl(id, { result, lastTested: run.at })
    get().recordAction({ action: `Re-tested control ${id} - ${result}`, entityId: id, route: `/controls/${id}`, detail: base.title })
    get().notify({ title: 'Control re-tested', body: `${id} - ${base.title}: ${result}.`, severity: result === 'Pass' ? 'info' : 'warn', entityId: id, route: `/controls/${id}` })
  },

  // ── Regulatory change (Epic 3.1) ────────────────────────────────────────────
  acknowledgeRegChange: (id) => {
    const c = getRegChange(id) ?? get().sessionRegChanges.find((r) => r.id === id)
    if (!c) return
    get().patchRegChange(id, { status: 'Closed' })
    get().recordAction({ action: `Acknowledged regulatory change ${id}`, entityId: id, route: `/reg-change/${id}`, detail: c.summary })
    get().notify({ title: 'Regulatory change acknowledged', body: `${id} - ${personName(c.owner)} alerted; ${c.impactedObligations.length} obligation(s) and ${c.impactedControls.length} control(s) updated.`, severity: 'info', entityId: id, route: `/reg-change/${id}` })
  },

  // ── Incident regulator-track filing (Epic 3.2) ──────────────────────────────
  // Files one regulator track (it leaves activeTracks); the incident itself stays
  // open so the marquee "1 Critical live" vital is preserved.
  fileIncidentTrack: (incidentId, trackIndex) => {
    const base = getIncident(incidentId)
    if (!base) return
    const cur = { ...base, ...(get().incidentOverrides[incidentId] ?? {}) }
    const tracks = cur.regulatorTracks.map((t, i) => (i === trackIndex ? { ...t, status: 'Filed' as const } : t))
    const filed = tracks[trackIndex]
    get().patchIncident(incidentId, { regulatorTracks: tracks })
    get().recordAction({ action: `Filed ${filed.regulator} report for ${incidentId}`, entityId: incidentId, route: `/incidents/${incidentId}`, detail: filed.output })
    get().notify({ title: `${filed.regulator} report filed`, body: `${incidentId} - ${filed.clockLabel} satisfied under maker-checker sign-off.`, severity: 'info', entityId: incidentId, route: `/incidents/${incidentId}` })
  },

  // ── Issue remediation + audit findings (Epic 3.3) ───────────────────────────
  // Resolving an audit-finding-sourced issue is what retires the finding and drops
  // the Open-findings metric (see lib/metrics). Session-override only; seed intact.
  resolveIssue: (id) => {
    const base = getIssue(id)
    if (!base) return
    const cur = { ...base, ...(get().issueOverrides[id] ?? {}) }
    if (cur.status === 'Resolved') return
    get().patchIssue(id, { status: 'Resolved' })
    get().recordAction({ action: `Resolved issue ${id}`, entityId: id, route: `/issues/${id}`, detail: cur.title })
    get().notify({ title: 'Issue resolved', body: `${id} - ${cur.title} closed with remediation evidence.`, severity: 'info', entityId: id, route: `/issues/${id}` })
  },

  // Bulk status write across selected issues — one audit-log line for the batch.
  bulkSetIssueStatus: (ids, status) => {
    const targets = ids.filter((id) => {
      const b = getIssue(id)
      return b && { ...b, ...(get().issueOverrides[id] ?? {}) }.status !== status
    })
    if (!targets.length) return
    for (const id of targets) get().patchIssue(id, { status })
    const verb = status === 'Resolved' ? 'Resolved' : `Set to "${status}"`
    get().recordAction({ action: `${verb} ${targets.length} issue(s)`, entityId: targets[0], route: '/issues', detail: targets.join(', ') })
    get().notify({ title: `${targets.length} issue(s) ${status === 'Resolved' ? 'resolved' : 'updated'}`, body: `Bulk ${status === 'Resolved' ? 'closure recorded with remediation evidence' : `status set to ${status}`}.`, severity: 'info', route: '/issues' })
  },

  // Closing an audit finding resolves its 1:1 remediation issue; the finding then
  // reads Closed through effectiveFinding and the Open-findings metric drops.
  closeFinding: (auditId, findingId) => {
    const audit = getAudit(auditId)
    if (!audit) return
    const f = audit.findings.find((x) => x.id === findingId)
    if (!f) return
    if (f.linkedIssue) get().patchIssue(f.linkedIssue, { status: 'Resolved' })
    get().recordAction({ action: `Closed audit finding ${findingId}`, entityId: auditId, route: `/audits/${auditId}`, detail: f.title })
    get().notify({ title: 'Audit finding closed', body: `${findingId} - ${f.title}${f.linkedIssue ? ` · remediation ${f.linkedIssue} resolved` : ''}.`, severity: 'info', entityId: auditId, route: `/audits/${auditId}` })
  },

  // ── DSAR erasure-vs-retention workflow (Epic 4.2) ───────────────────────────
  // Walks the 5-step locate→retain→erase→log→audit sequence one stage at a time.
  // The final stage marks the request Fulfilled and generates an immutable
  // ATR-DSAR-* audit record (a session artifact) — the provable handling the DPDP
  // Board and internal audit can inspect. Session-override only; seed intact.
  advanceDsar: (id) => {
    const base = getDsar(id)
    if (!base) return
    const cur = { ...base, ...(get().dsarOverrides[id] ?? {}) }
    const total = dsarTotalSteps(cur.type)
    if (cur.step >= total) return
    const next = cur.step + 1
    const isFinal = next >= total
    get().patchDsar(id, isFinal ? { step: next, status: 'Fulfilled' } : { step: next, status: 'In review' })
    if (isFinal) {
      const atr = `ATR-${id}`
      get().addArtifact({ kind: 'report', title: `DSAR audit record ${atr}`, createdAt: NOW.toISOString(), payload: { dsarId: id, kind: 'dsar-audit-record' } })
      get().recordAction({ action: `Generated DSAR audit record ${atr}`, entityId: id, route: `/dpdp/dsar/${id}`, detail: `${cur.type} request fulfilled; immutable audit record written.` })
      get().notify({ title: 'DSAR fulfilled', body: `${id} - ${cur.type} request closed; audit record ${atr} generated.`, severity: 'info', entityId: id, route: `/dpdp/dsar/${id}` })
    } else {
      get().recordAction({ action: `Advanced DSAR ${id} to step ${next}/${total}`, entityId: id, route: `/dpdp/dsar/${id}`, detail: cur.note })
    }
  },

  // A personal-data breach surfaced while handling a request feeds the same
  // incident workflow (DPDP breach intimation) — routed to the live incident.
  flagDsarBreach: (id) => {
    const base = getDsar(id)
    if (!base) return
    get().recordAction({ action: `Flagged personal-data breach from ${id}`, entityId: MARQUEE.id, route: `/incidents/${MARQUEE.id}`, detail: `Routed to incident ${MARQUEE.id} for DPDP Board breach intimation.` })
    get().notify({ title: 'Breach routed to incident workflow', body: `${id} - personal-data breach escalated to ${MARQUEE.id}; DPDP Board 72-hour intimation track engaged.`, severity: 'warn', entityId: MARQUEE.id, route: `/incidents/${MARQUEE.id}` })
  },
}))

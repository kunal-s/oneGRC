import { create } from 'zustand'
import type {
  Control, RoleKey, Obligation, Issue, Incident, RegulatoryChange, Dsar,
} from '@/types'
import { ROLES } from '@/data/people'
import { getSource, getObligation } from '@/data'
import { nextInstance } from '@/lib/recurrence'
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
const SEED_NOTIFICATIONS: NotificationItem[] = [
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
  // Engage a specialist (mocked workflow) for an unclear clause.
  engageSpecialist: (provisionId: string) => void
  // Record the specialist's outcome so Save is enabled (mocked).
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

  // ── Obligation workflow (Epic 2.1) ──────────────────────────────────────────
  // Maker submits, a different checker approves; status advances via overrides and
  // the action is written to the audit log + notifications. On approval the next
  // recurring instance is scheduled (Epic 2.2).
  submitObligation: (id: string) => void
  approveObligation: (id: string) => void
}

let toastSeq = 0
let artifactSeq = 0
let sessionControlSeq = 0
let auditSeq = 0
let notifSeq = 0

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
}))

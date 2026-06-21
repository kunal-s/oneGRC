import { create } from 'zustand'
import type { Control, RoleKey } from '@/types'
import { ROLES } from '@/data/people'
import { getSource } from '@/data'
import type { ClauseOverride, ClauseOverrides } from '@/lib/sources'
import { NOW } from '@/lib/time'

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
}

let toastSeq = 0
let artifactSeq = 0
let sessionControlSeq = 0

export const useApp = create<AppState>((set, get) => ({
  role: 'CRO',
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
}))

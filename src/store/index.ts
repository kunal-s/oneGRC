import { create } from 'zustand'
import type { ReviewState, RoleKey } from '@/types'
import { ROLES } from '@/data/people'
import { getSource } from '@/data'
import type { ProvisionOverride, ReviewOverrides } from '@/lib/sources'
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

  // Source Library review/approve lifecycle (Epic 15) — session overrides on a
  // provision's review state and the tracked records an approval produced.
  reviewOverrides: ReviewOverrides
  // Route a section to internal review / specialist (no records produced).
  reviewProvision: (provisionId: string, state: ReviewState, rationale?: string) => void
  // Save to controls — approve and track: creates the tracked obligation +
  // Control Library entry, returns their ids for the toast/navigation.
  approveProvision: (provisionId: string, rationale?: string) => { obligationId?: string; controlId: string }
}

let toastSeq = 0
let artifactSeq = 0
let savedControlSeq = 0

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

  reviewOverrides: {},
  reviewProvision: (provisionId, state, rationale) => {
    const reviewer = ROLES.find((r) => r.key === get().role)?.person ?? 'anjali'
    const override: ProvisionOverride = { reviewState: state, reviewer, reviewedAt: NOW.toISOString(), rationale }
    set((s) => ({ reviewOverrides: { ...s.reviewOverrides, [provisionId]: { ...s.reviewOverrides[provisionId], ...override } } }))
  },
  approveProvision: (provisionId, rationale) => {
    const reviewer = ROLES.find((r) => r.key === get().role)?.person ?? 'anjali'
    const prov = getSource(provisionId)
    // The tracked obligation is the one the ingestion recommended; the control
    // is a new Control Library entry (session-held, A10).
    const obligationId = prov?.linkedObligationId ?? prov?.recommendedObligationIds?.[0]
    const controlId = prov?.linkedControlId ?? `CTRL-NEW-${String(++savedControlSeq).padStart(3, '0')}`
    const override: ProvisionOverride = {
      reviewState: 'Approved and saved',
      reviewer,
      reviewedAt: NOW.toISOString(),
      rationale: rationale ?? 'Approved and saved to controls; tracked obligation created.',
      linkedObligationId: obligationId,
      linkedControlId: controlId,
    }
    set((s) => ({ reviewOverrides: { ...s.reviewOverrides, [provisionId]: override } }))
    return { obligationId, controlId }
  },
}))

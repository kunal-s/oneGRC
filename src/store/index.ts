import { create } from 'zustand'
import type { ReviewState, RoleKey } from '@/types'
import { ROLES } from '@/data/people'
import type { ReviewOverride, ReviewOverrides } from '@/lib/sources'
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

  // Applicability review (Epic 15) — session overrides on provision review state.
  reviewOverrides: ReviewOverrides
  setReviewState: (provisionId: string, state: ReviewState, rationale?: string) => void
}

let toastSeq = 0
let artifactSeq = 0

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
  setReviewState: (provisionId, state, rationale) => {
    const reviewer = ROLES.find((r) => r.key === get().role)?.person ?? 'anjali'
    const override: ReviewOverride = { reviewState: state, reviewer, reviewedAt: NOW.toISOString(), rationale }
    set((s) => ({ reviewOverrides: { ...s.reviewOverrides, [provisionId]: override } }))
  },
}))

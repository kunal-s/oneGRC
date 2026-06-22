import { useApp } from '@/store'
import type { RoleKey } from '@/types'

/**
 * Central role + maker-checker gating. Replaces ad hoc `role === 'X'` checks
 * scattered across pages so authority lives in one place (spec Section 10:
 * role-based, least-privilege, separation of duties).
 *
 * An action is described declaratively; `canAct` resolves it against the active
 * persona and, where relevant, the maker-checker rule (a maker may not approve
 * their own work). Phase 2+ adds more action kinds; the contract stays stable.
 */
export type GrcAction =
  // Accepting a clause as a tracked obligation / sending to a specialist is
  // restricted to the compliance-accountable persona (spec 4: Compliance + CoSec,
  // unified here as Compliance Manager).
  | { kind: 'clause.save' }
  | { kind: 'clause.specialist' }
  | { kind: 'clause.applicability' }
  // Maker-checker: submitting is the maker's act; approving is the checker's and
  // must not be the maker (separation of duties).
  | { kind: 'obligation.submit'; makerId?: string }
  | { kind: 'obligation.approve'; makerId?: string }
  | { kind: 'control.retest' }
  | { kind: 'incident.fileTrack'; makerId?: string }
  | { kind: 'issue.resolve' }
  | { kind: 'regchange.acknowledge' }
  | { kind: 'dsar.advance' }
  | { kind: 'admin.configure' }

// Which personas may perform each action kind.
const ABLE: Record<GrcAction['kind'], RoleKey[]> = {
  'clause.save': ['CCO'],
  'clause.specialist': ['CCO'],
  'clause.applicability': ['CCO'],
  'obligation.submit': ['CCO', 'ANALYST'],
  'obligation.approve': ['CCO', 'EXEC'],
  'control.retest': ['CTRLOWNER', 'AUDITOR', 'EXEC'],
  'incident.fileTrack': ['CTRLOWNER', 'EXEC'],
  'issue.resolve': ['CTRLOWNER', 'AUDITOR', 'CCO'],
  'regchange.acknowledge': ['CCO', 'ANALYST', 'RISK'],
  'dsar.advance': ['CCO', 'ANALYST'],
  'admin.configure': ['ADMIN'],
}

/** Resolve an action against a persona + the current person (for maker-checker). */
export function canAct(role: RoleKey, selfId: string, action: GrcAction): boolean {
  const allowed = ABLE[action.kind]?.includes(role)
  if (!allowed) return false
  // Separation of duties: the maker cannot approve / sign off their own item.
  if ('makerId' in action && action.makerId && action.kind.endsWith('approve')) {
    return action.makerId !== selfId
  }
  if (action.kind === 'incident.fileTrack' && action.makerId) {
    return action.makerId !== selfId
  }
  return true
}

/** Hook form: gate UI affordances against the active persona. */
export function useCanAct(action: GrcAction): boolean {
  const role = useApp((s) => s.role)
  const selfId = useApp((s) => s.currentPersonId)()
  return canAct(role, selfId, action)
}

import { daysFromNow } from '@/lib/time'

/**
 * Board committee cadence — chairs and meeting dates relative to the frozen demo
 * NOW. Shared by the PFRDA Pack (full register) and the Executive board-prep view
 * (next-meeting roll-up) so both read one source. `lastDays` / `nextDays` are day
 * offsets from NOW; resolve to ISO via `committeeDates`.
 */
export interface Committee {
  name: string
  short: string
  cadence: string
  chair: string
  lastDays: number
  nextDays: number
}

export const COMMITTEES: Committee[] = [
  { name: 'Investment Committee', short: 'Investment', cadence: 'Quarterly + monthly review', chair: 'arvind', lastDays: -22, nextDays: 68 },
  { name: 'Risk Management Committee', short: 'Risk', cadence: 'Quarterly', chair: 'meera', lastDays: -35, nextDays: 55 },
  { name: 'Audit Committee', short: 'Audit', cadence: 'Quarterly', chair: 'sunita', lastDays: -14, nextDays: 76 },
  { name: 'Nomination & Remuneration Committee', short: 'NRC', cadence: 'Half-yearly', chair: 'vikram', lastDays: -88, nextDays: 92 },
]

/** Resolve a committee's relative-day offsets to ISO last/next meeting dates. */
export function committeeDates(c: Committee): { last: string; next: string } {
  return { last: daysFromNow(c.lastDays), next: daysFromNow(c.nextDays) }
}

/** Committees ordered by soonest next meeting — for the board-prep next-up view. */
export function committeesByNextMeeting(): Committee[] {
  return [...COMMITTEES].sort((a, b) => a.nextDays - b.nextDays)
}

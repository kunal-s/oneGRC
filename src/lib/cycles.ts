// Per-cycle on-time-vs-late (enhancement plan 3 / E-E1, E-E2).
//
// A filed cycle is "on time" if it was filed on or before its due date, else
// "late". For recurring duties we also synthesise the recent cycles so the
// obligation detail can show, period by period, whether each was met on time.
import type { Obligation } from '@/types'
import { NOW_MS } from '@/lib/time'

const MONTHS: Record<string, number> = { Monthly: 1, Quarterly: 3, 'Half-yearly': 6, Annual: 12 }
const DAY = 86400000

export type Timing = 'on-time' | 'late' | 'pending'

/** Timing of a single obligation's current cycle. */
export function filingTiming(o: Obligation): Timing {
  if (o.status !== 'Filed') return 'pending'
  if (!o.filedAt) return 'on-time'
  return new Date(o.filedAt).getTime() <= new Date(o.dueDate).getTime() ? 'on-time' : 'late'
}

function stepBack(dueMs: number, frequency: string, n: number): number {
  const m = MONTHS[frequency]
  if (m) {
    const d = new Date(dueMs)
    d.setUTCMonth(d.getUTCMonth() - m * n)
    return d.getTime()
  }
  if (frequency === 'Weekly') return dueMs - n * 7 * DAY
  if (frequency === 'Fortnightly') return dueMs - n * 14 * DAY
  return dueMs - n * 30 * DAY
}

export interface Cycle {
  period: string // 'This cycle' | 'May 2026' style label
  dueDate: string
  filedAt?: string
  timing: Timing
}

function periodLabel(ms: number, frequency: string): string {
  const d = new Date(ms + (5 * 60 + 30) * 60000)
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]
  if (frequency === 'Annual') return `${d.getUTCFullYear()}`
  if (frequency === 'Quarterly' || frequency === 'Half-yearly') return `${mon} ${d.getUTCFullYear()}`
  return `${mon} ${d.getUTCFullYear()}`
}

/** The current cycle plus a few synthesised prior cycles, each with its timing.
 *  Prior cycles are deterministic (filed mostly on time, occasionally late). */
export function recentCycles(o: Obligation, count = 4): Cycle[] {
  const dueMs = new Date(o.dueDate).getTime()
  const cycles: Cycle[] = [
    { period: 'This cycle', dueDate: o.dueDate, filedAt: o.filedAt, timing: filingTiming(o) },
  ]
  // Deterministic jitter from the id so the same obligation always shows the same
  // history; one cycle is late to make the on-time/late distinction visible.
  const seed = o.id.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)
  for (let n = 1; n < count; n++) {
    const cDue = stepBack(dueMs, o.frequency, n)
    if (cDue > NOW_MS) continue
    const late = (seed + n) % 4 === 0
    const filed = cDue + (late ? ((seed % 5) + 2) : -((seed % 3))) * DAY
    cycles.push({
      period: periodLabel(cDue, o.frequency),
      dueDate: new Date(cDue).toISOString(),
      filedAt: new Date(filed).toISOString(),
      timing: filed <= cDue ? 'on-time' : 'late',
    })
  }
  return cycles
}

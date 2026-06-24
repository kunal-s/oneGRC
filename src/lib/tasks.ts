// Tasks — the actions that satisfy an obligation (enhancement plan 3 / spec 5.4).
//
// Every obligation is satisfied by one or more Tasks, each with a unique TSK id,
// its own maker and checker, due date, status, evidence and the source clause it
// discharges. Maker-checker, evidence and reminders/escalations are tracked HERE,
// at the task level, not duplicated on the obligation. A deduction-type duty (PT)
// has several tasks (its sub-steps); a single-action duty synthesises one task
// from the obligation itself, so the model is uniform.
import type { Obligation } from '@/types'
import { WORLD } from '@/data'
import { ladderFor, latestFired, type ReminderEvent } from '@/lib/reminders'

export interface Task {
  id: string // TSK id
  obligationId: string
  seq: number
  title: string
  clauseRefs: string[] // SourceProvision ids this task satisfies (TSK -> SRC)
  maker: string // who must complete it
  checker: string // who verifies it
  dueDate: string // ISO
  status: 'Done' | 'Pending' | 'Overdue'
  evidenceId?: string // proof, once done (kept for audit)
}

// Stable, readable TSK ids precomputed from the seed. Session-only obligations
// (recurring instances) fall back to a derived id.
const TSK_IDS = new Map<string, string>()
;(() => {
  let seq = 0
  for (const o of WORLD.obligations) {
    const n = o.subSteps?.length ?? 1
    for (let i = 1; i <= n; i++) TSK_IDS.set(`${o.id}#${i}`, `TSK-2026-${String(++seq).padStart(4, '0')}`)
  }
})()
const tskId = (obligationId: string, seq: number) => TSK_IDS.get(`${obligationId}#${seq}`) ?? `TSK-${obligationId}-${seq}`

const statusFromObligation = (s: Obligation['status']): Task['status'] =>
  s === 'Filed' ? 'Done' : s === 'Overdue' ? 'Overdue' : 'Pending'

/** The tasks that satisfy an obligation (its sub-steps, or one synthesised task).
 *  `taskEvidence` overlays session-attached proof (E0.3) onto the seed. */
export function tasksForObligation(o: Obligation, taskEvidence?: Record<string, string>): Task[] {
  const ev = (taskId: string, seed?: string) => taskEvidence?.[taskId] ?? seed
  if (o.subSteps && o.subSteps.length) {
    return o.subSteps.map((st) => {
      const id = tskId(o.id, st.seq)
      return {
        id,
        obligationId: o.id,
        seq: st.seq,
        title: st.title,
        clauseRefs: st.clauseRef ? [st.clauseRef] : [],
        maker: st.maker,
        checker: st.checker,
        dueDate: st.dueDate,
        status: st.status,
        evidenceId: ev(id, st.evidenceId),
      }
    })
  }
  const id = tskId(o.id, 1)
  return [
    {
      id,
      obligationId: o.id,
      seq: 1,
      title: o.requirement ?? `Complete and file: ${o.title}`,
      clauseRefs: o.sourceRefs ?? [],
      maker: o.makerChecker.maker,
      checker: o.makerChecker.checker,
      dueDate: o.dueDate,
      status: statusFromObligation(o.status),
      evidenceId: ev(id, o.evidence[0]),
    },
  ]
}

/** Control ids that satisfy a given source clause (clause -> control, for the chain). */
export function controlIdsForClause(clauseId: string): string[] {
  return WORLD.controls
    .filter((c) => c.sourceRefs?.includes(clauseId) || c.mappedFrameworkRefs.some((m) => m.sourceRef === clauseId))
    .map((c) => c.id)
}

/** The control(s) a task ultimately maps to, via the clauses it satisfies. */
export function controlIdsForTask(t: Task): string[] {
  return Array.from(new Set(t.clauseRefs.flatMap(controlIdsForClause)))
}

/** The most recent fired reminder/escalation for an open task (its own ladder). */
export function taskFollowUp(t: Task): ReminderEvent | undefined {
  if (t.status === 'Done') return undefined
  return latestFired(ladderFor(t.id, t.dueDate, t.maker, t.checker))
}

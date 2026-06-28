// Proof chain — the one canonical linkage that every record sits on:
//
//   [ SRC | POL ] -> CTRL -> OBL -> TSK -> EVD
//
// The first slot is conditional provenance: a statutory obligation/control traces
// to a Source clause (SRC); an internal, policy-mandated one traces to a Policy
// (POL), which itself derives from a source. The chain then flows downstream to
// the control that satisfies it, the obligation it discharges, the task that does
// the work and the evidence that proves it (task-anchored).
//
// `resolveProofChain` resolves the SAME spine from whichever entity a screen is
// about — by walking to the center obligation, pinning the entities the screen
// already knows, and marking its own node `current` — so the chain renders
// identically everywhere (no per-screen drift). Every populated node is a link;
// they all share the one link colour (no node is special-cased).
import type { Obligation, Control, Evidence, Policy } from '@/types'
import { WORLD, getControl, getObligation } from '@/data'
import { controlIdsForClause, controlIdsForTask, tasksForObligation, type Task, type TaskWorkflow } from '@/lib/tasks'
import { obligationsForClause, evidenceForClause, tasksForClause } from '@/lib/sources'

export type ChainKind = 'SRC' | 'POL' | 'CTRL' | 'OBL' | 'TSK' | 'EVD'

export interface ProofNode {
  kind: ChainKind
  label: string
  id?: string // resolved entity id, when one exists
  route?: string // SPA route to navigate to (absent => not linkable)
  extra?: number // "+N" sibling count, no detail (e.g. an obligation's other tasks)
  more?: { id: string; route: string }[] // "+N" siblings, each a jump-link in a popover
  current?: boolean // the current screen's own entity — highlighted, not linked
  placeholder?: string // shown in place of an id when the node is empty
}

/** The SPA route for a given chain node id. */
function routeFor(kind: ChainKind, id: string): string {
  switch (kind) {
    case 'SRC':
      return `/sources/section/${id}`
    case 'POL':
      return `/policies/${id}`
    case 'CTRL':
      return `/controls/${id}`
    case 'OBL':
      return `/obligations/${id}`
    case 'TSK':
      return `/tasks/${id}`
    case 'EVD':
      return `/evidence/${id}`
  }
}

/** Build a downstream node either from a fan-out id list (first + "+N" popover)
 *  or from a single resolved id with an optional sibling count. */
function chainNode(kind: ChainKind, ids: string[] | undefined, singleId: string | undefined, singleExtra: number, placeholder?: string): ProofNode {
  if (ids) {
    const primary = ids[0]
    const more = ids.slice(1).map((id) => ({ id, route: routeFor(kind, id) }))
    return { kind, label: KIND_LABEL[kind], id: primary, route: primary ? routeFor(kind, primary) : undefined, more: more.length ? more : undefined, placeholder }
  }
  return { kind, label: KIND_LABEL[kind], id: singleId, route: singleId ? routeFor(kind, singleId) : undefined, extra: singleExtra, placeholder }
}

const KIND_LABEL: Record<ChainKind, string> = {
  SRC: 'Source clause',
  POL: 'Policy',
  CTRL: 'Control',
  OBL: 'Obligation',
  TSK: 'Task',
  EVD: 'Evidence',
}

export interface ProofChainOpts {
  taskWorkflow?: Record<string, TaskWorkflow>
}

// ── relationship walks ───────────────────────────────────────────────────────

/** First (published, else any) policy that maps a control — control -> policy provenance. */
export function policyForControl(controlId: string): Policy | undefined {
  const mapped = WORLD.policies.filter((p) => p.mappedControls.includes(controlId))
  return mapped.find((p) => p.status === 'Published') ?? mapped[0]
}

/** Best-effort policy for an internal obligation, matched from its `policySource` label. */
function policyForObligation(o: Obligation): Policy | undefined {
  if (!o.policySource) return undefined
  const label = o.policySource.toLowerCase()
  const head = label.split('(')[0].trim()
  return WORLD.policies.find((p) => {
    const t = p.title.toLowerCase()
    return t === label || label.includes(t) || t.includes(head)
  })
}

/** The clauses (statutory provenance) a control satisfies — direct or via framework maps. */
function clausesForControl(c: Control): string[] {
  const refs = new Set<string>(c.sourceRefs ?? [])
  for (const m of c.mappedFrameworkRefs) if (m.sourceRef) refs.add(m.sourceRef)
  return [...refs]
}

/** A representative obligation a control satisfies (control -> clause -> obligation). */
function obligationForControl(c: Control): Obligation | undefined {
  const clauses = new Set(clausesForControl(c))
  return WORLD.obligations.find((o) => o.sourceRefs?.some((r) => clauses.has(r)))
}

/** The control that satisfies an obligation's first clause (obligation -> control). */
function controlForObligation(o: Obligation): Control | undefined {
  const clauseId = o.sourceRefs?.[0]
  const cid = clauseId ? controlIdsForClause(clauseId)[0] : undefined
  return cid ? getControl(cid) : undefined
}

/** The task (and its obligation) a piece of evidence proves (evidence -> task). */
function taskForEvidence(evId: string, wf?: Record<string, TaskWorkflow>): { task: Task; obligation: Obligation } | undefined {
  for (const o of WORLD.obligations) {
    const t = tasksForObligation(o, wf).find((x) => x.evidenceId === evId)
    if (t) return { task: t, obligation: o }
  }
  return undefined
}

// ── node assembly ────────────────────────────────────────────────────────────

/** The conditional provenance node (POL for policy-mandated, SRC for statutory). */
function provenanceNode(o: Obligation | undefined, control: Control | undefined, clauseId: string | undefined, clauseExtra: number): ProofNode {
  if (o?.origin === 'Internal') {
    const pol = (control ? policyForControl(control.id) : undefined) ?? policyForObligation(o)
    if (pol) return { kind: 'POL', label: KIND_LABEL.POL, id: pol.id, route: `/policies/${pol.id}` }
  }
  return { kind: 'SRC', label: KIND_LABEL.SRC, id: clauseId, route: clauseId ? `/sources/section/${clauseId}` : undefined, extra: clauseExtra }
}

interface ChainContext {
  obligation?: Obligation
  control?: Control
  task?: Task
  evidenceId?: string
  clauseId?: string // overrides the SRC clause (e.g. a task's own clause)
  clauseExtra?: number
  // Fan-out id lists — when one clause maps to many controls / obligations /
  // tasks / evidence, the first is the jump-link and the rest fill the popover.
  controlIds?: string[]
  obligationIds?: string[]
  taskIds?: string[]
  evidenceIds?: string[]
  // "+N" sibling counts (no detail) for single-resolved nodes.
  controlExtra?: number
  obligationExtra?: number
  taskExtra?: number
  evidenceExtra?: number
  current: ChainKind
  opts: ProofChainOpts
}

function buildChain(ctx: ChainContext): ProofNode[] {
  const o = ctx.obligation
  const control = ctx.control ?? (o ? controlForObligation(o) : undefined)

  const tasks = o ? tasksForObligation(o, ctx.opts.taskWorkflow) : []
  const task = ctx.task ?? tasks[0]
  const taskExtra = ctx.taskExtra ?? (ctx.task ? 0 : Math.max(0, tasks.length - 1))
  const evidenceId = ctx.evidenceId ?? task?.evidenceId

  const clauseId = ctx.clauseId ?? o?.sourceRefs?.[0] ?? control?.sourceRefs?.[0] ?? control?.mappedFrameworkRefs.find((m) => m.sourceRef)?.sourceRef
  const clauseExtra = ctx.clauseExtra ?? (o?.sourceRefs ? Math.max(0, o.sourceRefs.length - 1) : 0)

  // When the clause itself is the entry (SRC page), it occupies slot 0 regardless
  // of origin — the conditional POL slot only applies upstream of a control.
  const provenance: ProofNode =
    ctx.current === 'SRC'
      ? { kind: 'SRC', label: KIND_LABEL.SRC, id: clauseId, route: clauseId ? `/sources/section/${clauseId}` : undefined, extra: clauseExtra }
      : provenanceNode(o, control, clauseId, clauseExtra)

  const nodes: ProofNode[] = [
    provenance,
    chainNode('CTRL', ctx.controlIds, control?.id, ctx.controlExtra ?? 0),
    chainNode('OBL', ctx.obligationIds, o?.id, ctx.obligationExtra ?? 0),
    chainNode('TSK', ctx.taskIds, task?.id, taskExtra),
    chainNode('EVD', ctx.evidenceIds, evidenceId, ctx.evidenceExtra ?? 0, 'none yet'),
  ]

  // The screen's own entity is highlighted, not a link back to itself.
  return nodes.map((n) => (n.kind === ctx.current ? { ...n, current: true, route: undefined } : n))
}

// ── public resolver ──────────────────────────────────────────────────────────

export type ProofAnchor =
  | { kind: 'obligation'; obligation: Obligation }
  | { kind: 'control'; control: Control; obligation?: Obligation }
  | { kind: 'task'; task: Task; obligation: Obligation }
  | { kind: 'evidence'; evidence: Evidence; control?: Control; obligation?: Obligation }
  | { kind: 'source'; clauseId: string; linkedControlId?: string }

/** Resolve the canonical proof chain for a screen's anchor entity. */
export function resolveProofChain(anchor: ProofAnchor, opts: ProofChainOpts = {}): ProofNode[] {
  switch (anchor.kind) {
    case 'obligation':
      return buildChain({ obligation: anchor.obligation, current: 'OBL', opts })
    case 'source': {
      // One clause fans out to many controls, obligations, tasks and evidence;
      // the first of each is the jump-link, the rest fill the "+N" popover.
      const ctrlIds = new Set(controlIdsForClause(anchor.clauseId))
      if (anchor.linkedControlId) ctrlIds.add(anchor.linkedControlId)
      return buildChain({
        clauseId: anchor.clauseId,
        clauseExtra: 0,
        controlIds: [...ctrlIds],
        obligationIds: obligationsForClause(anchor.clauseId).map((o) => o.id),
        taskIds: tasksForClause(anchor.clauseId).map((t) => t.id),
        evidenceIds: evidenceForClause(anchor.clauseId).map((e) => e.id),
        current: 'SRC',
        opts,
      })
    }
    case 'control':
      return buildChain({ control: anchor.control, obligation: anchor.obligation ?? obligationForControl(anchor.control), current: 'CTRL', opts })
    case 'task': {
      const cid = controlIdsForTask(anchor.task)[0]
      return buildChain({
        task: anchor.task,
        obligation: anchor.obligation,
        control: cid ? getControl(cid) : undefined,
        clauseId: anchor.task.clauseRefs[0],
        clauseExtra: Math.max(0, anchor.task.clauseRefs.length - 1),
        current: 'TSK',
        opts,
      })
    }
    case 'evidence': {
      const ev = anchor.evidence
      const found = taskForEvidence(ev.id, opts.taskWorkflow)
      const obligation = anchor.obligation ?? found?.obligation ?? (ev.linkedObligations[0] ? getObligation(ev.linkedObligations[0]) : undefined)
      const control = anchor.control ?? (ev.linkedControls[0] ? getControl(ev.linkedControls[0]) : undefined)
      return buildChain({ evidenceId: ev.id, control, task: found?.task, obligation, current: 'EVD', opts })
    }
  }
}

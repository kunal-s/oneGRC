import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ListChecks, FileCheck, Paperclip, BellRing, AlertTriangle, CheckCircle2, Clock, ScrollText, ShieldCheck, FileText, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getControl } from '@/data'
import { PEOPLE_BY_ID, personName, departmentOfPerson, departmentHeadOf } from '@/data/people'
import { useApp } from '@/store'
import { useEffectiveObligations } from '@/lib/effective'
import { useScope } from '@/lib/access'
import { tasksForObligation, controlIdsForTask, type Task } from '@/lib/tasks'
import { ladderFor } from '@/lib/reminders'
import { fmtIST, fmtDate } from '@/lib/time'
import type { Obligation } from '@/types'
import { ComingSoon } from './ComingSoon'

export function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const scope = useScope()
  const selfId = useApp((s) => s.currentPersonId)()
  const taskWorkflow = useApp((s) => s.taskWorkflow)
  const getAnyEvidence = useApp((s) => s.getAnyEvidence)
  const attachTaskEvidence = useApp((s) => s.attachTaskEvidence)
  const verifyTask = useApp((s) => s.verifyTask)
  const pushToast = useApp((s) => s.pushToast)
  const obligations = useEffectiveObligations()

  // Resolve the task by its TSK id across the (effective) obligations.
  let task: Task | undefined
  let obligation: Obligation | undefined
  for (const o of obligations) {
    const t = tasksForObligation(o, taskWorkflow).find((x) => x.id === id)
    if (t) {
      task = t
      obligation = o
      break
    }
  }

  if (!task || !obligation) return <ComingSoon title="Task not found" />

  const maker = PEOPLE_BY_ID[task.maker]
  const checker = PEOPLE_BY_ID[task.checker]
  const controlId = controlIdsForTask(task)[0]
  const control = controlId ? getControl(controlId) : undefined
  const evidence = task.evidenceId ? getAnyEvidence(task.evidenceId) : undefined
  const verified = task.status === 'Done'
  // The department head may step into the maker step on the owner's behalf (1.5).
  const head = departmentHeadOf(departmentOfPerson(task.maker))
  const isDeptHead = !!head && selfId === head && selfId !== task.maker
  // Maker may attach when assigned; the department head (or Compliance/admin) may
  // step in for the owner. Checker may verify only after evidence exists, and never
  // the person who attached it (separation of duties).
  const canAttach = !evidence && (selfId === task.maker || isDeptHead || scope.seesAll)
  const actingOnBehalf = canAttach && selfId !== task.maker
  const attachLabel = selfId === task.maker ? 'Attach evidence' : `Attach on behalf of ${maker.name}`
  const attacher = task.attachedBy ?? task.maker
  const canVerify = !!evidence && !verified && selfId !== attacher && (selfId === task.checker || scope.seesAll)
  const ladder = verified ? [] : ladderFor(task.id, task.dueDate, task.maker, task.checker)

  const scrollToEvidence = () => document.getElementById('task-evidence')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const onAttach = () => {
    const newId = attachTaskEvidence({
      taskId: task!.id,
      obligationId: obligation!.id,
      controlId,
      title: `${task!.title} — proof`,
      type: 'Filing ack',
      onBehalfOf: actingOnBehalf ? task!.maker : undefined,
    })
    pushToast({ title: actingOnBehalf ? 'Evidence attached on behalf of the owner' : 'Evidence created & linked', description: `${newId} attached to ${task!.id}. Awaiting checker verification.`, variant: 'success' })
  }
  const onVerify = () => {
    verifyTask({ taskId: task!.id, obligationId: obligation!.id })
    pushToast({ title: 'Task verified', description: `${task!.id} checked and accepted.`, variant: 'success' })
  }

  return (
    <div>
      <button onClick={() => navigate(`/obligations/${obligation.id}`)} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> {obligation.id}
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{task.id}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">Task</span>
            <span className="text-muted-foreground">· satisfies {obligation.id}</span>
          </span>
        }
        title={task.title}
        description={`Maker ${maker.name} (${maker.title}) performs this; ${checker.name} verifies it. Due ${fmtDate(task.dueDate)}.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={task.status} />
            {!evidence ? (
              <Button size="sm" disabled={!canAttach} title={canAttach ? undefined : `Only the maker (${maker.name}) or the department head can attach evidence.`} onClick={onAttach}>
                <Paperclip className="size-4" /> {attachLabel}
              </Button>
            ) : !verified ? (
              <Button size="sm" disabled={!canVerify} title={canVerify ? undefined : `Verification is the checker's step (${checker.name}) and cannot be done by whoever attached the evidence.`} onClick={onVerify}>
                <ClipboardCheck className="size-4" /> Verify
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Proof chain — step upstream (why / what proves it) and downstream (the proof). */}
      <div className="card-surface mb-4 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Proof chain</h3>
        </div>
        <div className="flex flex-wrap items-stretch gap-1.5">
          <ChainNode icon={<ScrollText className="size-3.5" />} kind="Source clause" id={task.clauseRefs[0]} extra={task.clauseRefs.length > 1 ? task.clauseRefs.length - 1 : 0} onClick={task.clauseRefs[0] ? () => navigate(`/sources/section/${task!.clauseRefs[0]}`) : undefined} />
          <Arrow />
          <ChainNode icon={<ShieldCheck className="size-3.5" />} kind="Control" id={control?.id} onClick={control ? () => navigate(`/controls/${control.id}`) : undefined} />
          <Arrow />
          <ChainNode icon={<FileText className="size-3.5" />} kind="Obligation" id={obligation.id} onClick={() => navigate(`/obligations/${obligation!.id}`)} />
          <Arrow />
          <ChainNode icon={<ClipboardCheck className="size-3.5" />} kind="This task" id={task.id} current />
          <Arrow />
          <ChainNode icon={<Paperclip className="size-3.5" />} kind="Evidence" id={evidence?.id} placeholder="none yet" tone="ok" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Maker -> checker */}
        <div className="card-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ListChecks className="size-4 text-info" /> Maker &rarr; checker
          </h3>
          <Step
            done={!!evidence || task.status === 'Done'}
            role="Maker performs &amp; attaches evidence"
            personId={task.attachedBy ?? task.maker}
            at={task.attachedAt}
            subNote={task.attachedOnBehalfOf ? `on behalf of ${personName(task.attachedOnBehalfOf)} (department head step-in)` : undefined}
            evidenceId={evidence ? task.evidenceId : undefined}
            onEvidenceClick={evidence ? scrollToEvidence : undefined}
            note={evidence ? 'Attached' : task.status === 'Done' ? 'Completed' : 'Awaiting action'}
          />
          <div className="ml-3.5 h-4 border-l border-dashed border-border" />
          <Step
            done={verified}
            role="Checker verifies the evidence"
            personId={task.verifiedBy ?? task.checker}
            at={task.verifiedAt}
            evidenceId={verified && evidence ? task.evidenceId : undefined}
            onEvidenceClick={verified && evidence ? scrollToEvidence : undefined}
            note={verified ? 'Verified' : evidence ? 'Pending verification' : 'Pending'}
          />
        </div>

        {/* Evidence */}
        <div id="task-evidence" className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <FileCheck className="size-4 text-ok" /> Evidence
          </h3>
          {evidence ? (
            <div className="rounded-md border border-ok/30 bg-ok-soft/40 p-2.5">
              <div className="flex items-center gap-2">
                <Paperclip className="size-3.5 text-ok" />
                <span className="font-mono text-2xs font-semibold text-info">{evidence.id}</span>
                <StatusChip status={evidence.type} />
              </div>
              <div className="mt-1 text-sm text-foreground">{evidence.title}</div>
              <div className="mt-1 text-2xs text-muted-foreground">
                Captured by {personName(evidence.capturedBy)} · {fmtIST(evidence.capturedAt)} · {evidence.source}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">No evidence attached yet — this is the inspection gap to close.</p>
              <Button className="mt-2" size="sm" variant="outline" disabled={!canAttach} title={canAttach ? undefined : `Only the maker (${maker.name}) or the department head can attach evidence.`} onClick={onAttach}>
                <Paperclip className="size-4" /> {selfId === task.maker ? 'Attach / create evidence' : attachLabel}
              </Button>
              {isDeptHead && <p className="mt-1.5 text-2xs text-muted-foreground">You are the {departmentOfPerson(task.maker)} head — you may step in for {maker.name}.</p>}
            </div>
          )}
        </div>

        {/* Reminders & escalations */}
        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <BellRing className="size-4 text-info" /> Reminders &amp; escalations
          </h3>
          {ladder.length === 0 ? (
            <p className="text-xs text-muted-foreground">Task complete — no further reminders.</p>
          ) : (
            <ol className="space-y-1.5">
              {ladder.map((e) => {
                const esc = e.kind === 'escalation'
                return (
                  <li key={`${e.kind}-${e.offsetDays}`} className="flex items-center gap-2">
                    <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border', !e.fired ? 'border-dashed border-border text-muted-foreground' : esc ? 'border-critical/40 bg-critical-soft text-critical' : 'border-info/40 bg-info-soft text-info')}>
                      {esc ? <AlertTriangle className="size-3" /> : <BellRing className="size-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-2xs font-medium', esc ? 'text-critical' : 'text-foreground')}>
                        {esc ? 'Escalation' : 'Reminder'} · {e.intervalLabel} <span className="text-muted-foreground">&rarr; {e.targetRole}</span>
                      </div>
                      <div className="text-2xs text-muted-foreground tnum">{fmtIST(e.at)}</div>
                    </div>
                    <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold', e.fired ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>{e.fired ? 'Fired' : 'Scheduled'}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

function Arrow() {
  return <span className="flex items-center text-muted-foreground"><ChevronRight className="size-4" /></span>
}

function ChainNode({
  icon,
  kind,
  id,
  onClick,
  current,
  placeholder,
  tone,
  extra = 0,
}: {
  icon: React.ReactNode
  kind: string
  id?: string
  onClick?: () => void
  current?: boolean
  placeholder?: string
  tone?: 'ok'
  extra?: number
}) {
  const clickable = !!onClick && !!id
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        'flex min-w-[130px] flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors',
        current
          ? 'border-primary bg-primary/10'
          : id
            ? cn('border-border bg-background', clickable && 'hover:border-info/40 hover:bg-info-soft/40')
            : 'border-dashed border-border bg-muted/30',
        !clickable && 'cursor-default',
      )}
    >
      <span className="flex items-center gap-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {kind}
      </span>
      <span className={cn('font-mono text-2xs font-semibold', id ? (tone === 'ok' ? 'text-ok' : 'text-info') : 'text-muted-foreground')}>
        {id ?? placeholder ?? '—'}
        {extra > 0 && <span className="ml-1 text-muted-foreground">+{extra}</span>}
      </span>
    </button>
  )
}

function Step({
  done,
  role,
  personId,
  note,
  at,
  subNote,
  evidenceId,
  onEvidenceClick,
}: {
  done?: boolean
  role: string
  personId: string
  note: string
  at?: string
  subNote?: string
  evidenceId?: string
  onEvidenceClick?: () => void
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', done ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
        {done ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{role}</div>
        <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-foreground">
          <Avatar id={personId} size={18} /> {personName(personId)}
        </div>
        {subNote && <div className="mt-0.5 text-2xs font-medium text-accent-foreground">{subNote}</div>}
        {at && <div className="mt-0.5 text-2xs text-muted-foreground tnum">{fmtIST(at)}</div>}
        {evidenceId && (
          <button onClick={onEvidenceClick} className="mt-1 inline-flex items-center gap-1 rounded border border-ok/30 bg-ok-soft/50 px-1.5 py-0.5 text-2xs text-ok hover:underline">
            <Paperclip className="size-3" /> {evidenceId}
          </button>
        )}
      </div>
      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-2xs font-medium', done ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>{note}</span>
    </div>
  )
}

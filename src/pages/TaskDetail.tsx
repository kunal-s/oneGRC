import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ListChecks, FileCheck, Paperclip, BellRing, AlertTriangle, CheckCircle2, Clock, ScrollText, ShieldCheck, FileText, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getControl } from '@/data'
import { PEOPLE_BY_ID, personName } from '@/data/people'
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
  const taskEvidence = useApp((s) => s.taskEvidence)
  const getAnyEvidence = useApp((s) => s.getAnyEvidence)
  const attachTaskEvidence = useApp((s) => s.attachTaskEvidence)
  const pushToast = useApp((s) => s.pushToast)
  const obligations = useEffectiveObligations()

  // Resolve the task by its TSK id across the (effective) obligations.
  let task: Task | undefined
  let obligation: Obligation | undefined
  for (const o of obligations) {
    const t = tasksForObligation(o, taskEvidence).find((x) => x.id === id)
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
  const canAttach = selfId === task.maker || scope.seesAll
  const ladder = task.status === 'Done' ? [] : ladderFor(task.id, task.dueDate, task.maker, task.checker)

  const onAttach = () => {
    const newId = attachTaskEvidence({
      taskId: task!.id,
      obligationId: obligation!.id,
      controlId,
      title: `${task!.title} — proof`,
      type: 'Filing ack',
    })
    pushToast({ title: 'Evidence created & linked', description: `${newId} attached to ${task!.id}.`, variant: 'success' })
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
            {!evidence && (
              <Button size="sm" disabled={!canAttach} title={canAttach ? undefined : `Only the maker (${maker.name}) can attach evidence.`} onClick={onAttach}>
                <Paperclip className="size-4" /> Attach evidence
              </Button>
            )}
          </div>
        }
      />

      {/* Proof chain — step upstream (why / what proves it) and downstream (the proof). */}
      <div className="card-surface mb-4 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Proof chain · click a node to step through</h3>
          <span className="text-2xs text-muted-foreground">&#9664; upstream: why / what proves it · downstream: the proof &#9654;</span>
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
          <Step done role="Maker performs the task" personId={task.maker} note={evidence ? 'Evidence attached' : 'Awaiting action'} />
          <div className="ml-3 h-3 border-l border-dashed border-border" />
          <Step done={verified} role="Checker verifies" personId={task.checker} note={verified ? 'Verified' : evidence ? 'Pending verification' : 'Pending'} />
          <p className="mt-3 text-2xs text-muted-foreground">Two-step maker-checker: the person who performs the task is not the person who verifies it.</p>
        </div>

        {/* Evidence */}
        <div className="card-surface p-4">
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
              <Button className="mt-2" size="sm" variant="outline" disabled={!canAttach} title={canAttach ? undefined : `Only the maker (${maker.name}) can attach evidence.`} onClick={onAttach}>
                <Paperclip className="size-4" /> Attach / create evidence
              </Button>
            </div>
          )}
          <p className="mt-2 text-2xs text-muted-foreground">Creating the evidence record links it to this task, its obligation and its control, and writes to the audit log.</p>
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

function Step({ done, role, personId, note }: { done?: boolean; role: string; personId: string; note: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', done ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
        {done ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{role}</div>
        <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-foreground">
          <Avatar id={personId} size={18} /> {personName(personId)}
        </div>
      </div>
      <span className="shrink-0 text-2xs text-muted-foreground">{note}</span>
    </div>
  )
}

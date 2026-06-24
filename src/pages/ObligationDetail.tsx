import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Upload, Send, CheckCircle2, GitPullRequestArrow, ArrowUpRight, FileCheck, ScrollText, BellRing, AlertTriangle, ListChecks, ArrowRight, Paperclip } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { EvidenceList } from '@/components/EvidenceList'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { MakerCheckerChain } from '@/components/MakerChecker'
import { SourceList } from '@/components/SourceRef'
import { RegulatorChip } from '@/lib/regulators'
import { cn } from '@/lib/utils'
import { getRegChange, getEvidence, WORLD } from '@/data'
import { PEOPLE_BY_ID, personName } from '@/data/people'
import { reminderEvents, subStepLadder, latestFired } from '@/lib/reminders'
import { fmtIST, fmtDate, fmtRelative, NOW_MS } from '@/lib/time'
import type { ObligationSubStep } from '@/types'
import { useApp } from '@/store'
import { useEffectiveObligation } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { ComingSoon } from './ComingSoon'

export function ObligationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const openDrawer = useApp((s) => s.openDrawer)
  const submitObligation = useApp((s) => s.submitObligation)
  const approveObligation = useApp((s) => s.approveObligation)
  const o = useEffectiveObligation(id ?? '')
  const canSubmit = useCanAct({ kind: 'obligation.submit' })
  const canApprove = useCanAct({ kind: 'obligation.approve', makerId: o?.makerChecker.maker })

  if (!o) return <ComingSoon title="Obligation not found" />

  const internal = o.origin === 'Internal'
  const owner = PEOPLE_BY_ID[o.owner]
  const completedNoEvidence = (o.status === 'In review' || o.status === 'Filed') && o.evidence.length === 0
  const evidence = o.evidence.map((e) => WORLD.evidence.find((x) => x.id === e)).filter(Boolean) as typeof WORLD.evidence
  const regChange = o.linkedRegChange ? getRegChange(o.linkedRegChange) : undefined
  const overdue = o.status === 'Overdue'
  const daysToDue = Math.round((new Date(o.dueDate).getTime() - NOW_MS) / 86400000)
  const ladder = reminderEvents(o)

  return (
    <div>
      <button onClick={() => navigate('/obligations')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Obligations & Calendar
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{o.id}</span>
            {internal ? (
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-2xs font-medium text-accent-foreground">Internal policy</span>
            ) : (
              <RegulatorChip regulator={o.regulator} />
            )}
            <span className="text-muted-foreground">· {o.frequency} · ref {o.reference}</span>
          </span>
        }
        title={o.title}
        description={
          internal
            ? `Policy-driven duty (${o.policySource ?? 'internal policy'}); owned by ${owner.name} (${owner.title}) under maker-checker control - tracked identically to a statutory filing.`
            : `Filed with ${o.regulator}; owned by ${owner.name} (${owner.title}) under maker-checker control.`
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={o.status} />
            {o.status === 'In review' ? (
              <Button size="sm" disabled={!canApprove} title={canApprove ? undefined : 'Approval is restricted to the checker (a Compliance Manager or the Executive who is not the maker).'} onClick={() => approveObligation(o.id)}>
                <CheckCircle2 className="size-4" /> Approve filing
              </Button>
            ) : o.status !== 'Filed' ? (
              <Button size="sm" disabled={!canSubmit} title={canSubmit ? undefined : 'Submitting is restricted to the Compliance Manager / Analyst (maker).'} onClick={() => submitObligation(o.id)}>
                <Send className="size-4" /> Submit for check
              </Button>
            ) : null}
          </div>
        }
      />

      {completedNoEvidence && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-medium/40 bg-medium-soft/40 px-3.5 py-2.5 text-sm text-foreground">
          <FileCheck className="size-4 shrink-0 text-medium" />
          <span><span className="font-medium">Lacking evidence.</span> This duty is marked done but has no evidence attached - the exact gap that hurts firms at inspection. Attach the {internal ? 'committee minute' : 'filing acknowledgement'} to complete it.</span>
        </div>
      )}

      <div className={cn('mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3.5 py-2.5', overdue ? 'border-critical/30 bg-critical-soft/40' : 'border-border bg-muted/30')}>
        <CalendarClock className={cn('size-4', overdue ? 'text-critical' : 'text-muted-foreground')} />
        <span className="text-sm font-medium text-foreground">Due {fmtIST(o.dueDate)}</span>
        <span className={cn('text-xs', overdue ? 'font-medium text-critical' : 'text-muted-foreground')}>
          {overdue ? `overdue by ${Math.abs(daysToDue)} days` : `${daysToDue} days remaining`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {o.subSteps && o.subSteps.length > 0 && (
            <SatisfyStepsCard steps={o.subSteps} navigate={navigate} />
          )}

          <div className="card-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Maker-checker</h3>
            <MakerCheckerChain mc={o.makerChecker} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Attr label="Owner">
                <span className="inline-flex items-center gap-1.5"><Avatar id={o.owner} size={20} /> <span className="text-xs">{owner.name}</span></span>
              </Attr>
              <Attr label="Regulator">{o.regulator}</Attr>
              <Attr label="Frequency">{o.frequency}</Attr>
              <Attr label="Reference">{o.reference}</Attr>
            </div>
          </div>

          <div className="card-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <FileCheck className="size-4 text-ok" /> Evidence & filing acknowledgements
              </h3>
              <Button variant="outline" size="sm" onClick={() => openDrawer({ kind: 'evidence-upload', title: `Attach filing ack — ${o.id}` })}>
                <Upload className="size-4" /> Upload ack
              </Button>
            </div>
            <EvidenceList items={evidence} />
            <p className="mt-2 text-2xs text-muted-foreground">Filing acknowledgements and supporting evidence are retained on the obligation record and reused for audit.</p>
          </div>

          {ladder.length > 0 && (
            <div className="card-surface p-4">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <BellRing className="size-4 text-info" /> Reminders &amp; escalations
              </h3>
              <p className="mb-3 text-2xs text-muted-foreground">
                Reminders at 7, 3 and 1 days before due; escalations at 1, 3 and 7 days overdue. Every fired event is written to the audit log.
              </p>
              <ol className="space-y-1.5">
                {ladder.map((e) => {
                  const esc = e.kind === 'escalation'
                  return (
                    <li key={`${e.kind}-${e.offsetDays}`} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full border',
                          !e.fired
                            ? 'border-dashed border-border text-muted-foreground'
                            : esc
                              ? 'border-critical/40 bg-critical-soft text-critical'
                              : 'border-info/40 bg-info-soft text-info',
                        )}
                      >
                        {esc ? <AlertTriangle className="size-3" /> : <BellRing className="size-3" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={cn('font-medium', esc ? 'text-critical' : 'text-foreground')}>
                            {esc ? 'Escalation' : 'Reminder'} · {e.intervalLabel}
                          </span>
                          <span className="text-2xs text-muted-foreground">→ {e.targetRole} ({e.targets.map(personName).join(', ')})</span>
                        </div>
                        <div className="text-2xs text-muted-foreground tnum">{fmtIST(e.at)}</div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold',
                          e.fired ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {e.fired ? 'Fired' : 'Scheduled'}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {o.sourceRefs && o.sourceRefs.length > 0 && (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <ScrollText className="size-4 text-info" /> Source
              </h3>
              <SourceList ids={o.sourceRefs} />
              <p className="mt-2 text-2xs text-muted-foreground">
                The instrument this obligation derives from — open to read the exact section and excerpt.
              </p>
            </div>
          )}

          {regChange ? (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <GitPullRequestArrow className="size-4 text-info" /> Source regulatory change
              </h3>
              <button
                onClick={() => navigate(`/reg-change/${regChange.id}`)}
                className="group block w-full rounded-md border border-border bg-background p-2.5 text-left hover:border-info/40 hover:bg-info-soft/40"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xs font-semibold text-info">{regChange.id}</span>
                  <StatusChip status={regChange.status} />
                  <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-1 text-xs text-foreground">{regChange.summary}</div>
                <div className="mt-0.5 text-2xs text-muted-foreground">{regChange.source} · {fmtRelative(regChange.publishedAt)}</div>
              </button>
              <p className="mt-2 text-2xs text-muted-foreground">This obligation was created/updated automatically when the change was ingested.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// "What it takes to satisfy this" — the ordered actions (sub-steps), each a task
// with its own maker, checker, due date, status and evidence. Different
// departments can own different steps (HR & Labour deducts/files; Finance pays).
function SatisfyStepsCard({ steps, navigate }: { steps: ObligationSubStep[]; navigate: (to: string) => void }) {
  const done = steps.filter((s) => s.status === 'Done').length
  return (
    <div className="card-surface p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ListChecks className="size-4 text-info" /> What it takes to satisfy this
        </h3>
        <span className="text-2xs font-medium text-muted-foreground tnum">{done} of {steps.length} done</span>
      </div>
      <p className="mb-3 text-2xs text-muted-foreground">
        Ordered actions, each a maker-checker task with its own due date and evidence. Reminders and escalations chase the owner of each step.
      </p>
      <ol className="space-y-2.5">
        {steps.map((s) => {
          const ev = s.evidenceId ? getEvidence(s.evidenceId) : undefined
          const overdue = s.status === 'Overdue'
          const pending = s.status === 'Pending'
          const fired = pending || overdue ? latestFired(subStepLadder(s)) : undefined
          return (
            <li key={s.id} className="rounded-md border border-border bg-background p-2.5">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold',
                    s.status === 'Done' ? 'bg-ok-soft text-ok' : overdue ? 'bg-critical-soft text-critical' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {s.status === 'Done' ? <CheckCircle2 className="size-3.5" /> : s.seq}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{s.title}</span>
                    {s.clauseRef && (
                      <button
                        onClick={() => navigate(`/sources/section/${s.clauseRef}`)}
                        className="rounded bg-info-soft px-1.5 py-0 font-mono text-2xs font-semibold text-info hover:underline"
                      >
                        {s.clauseRef}
                      </button>
                    )}
                    <span className={cn('ml-auto rounded px-1.5 py-0.5 text-2xs font-semibold', s.status === 'Done' ? 'bg-ok-soft text-ok' : overdue ? 'bg-critical-soft text-critical' : 'bg-muted text-muted-foreground')}>
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Avatar id={s.maker} size={14} /> {personName(s.maker)}
                      <span className="text-muted-foreground/70">does</span>
                      <ArrowRight className="size-3" />
                      <Avatar id={s.checker} size={14} /> {personName(s.checker)}
                      <span className="text-muted-foreground/70">verifies</span>
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className={cn(overdue && 'font-medium text-critical')}>by {fmtDate(s.dueDate)} ({fmtRelative(s.dueDate)})</span>
                  </div>
                  <div className="mt-1.5">
                    {ev ? (
                      <span className="inline-flex items-center gap-1 rounded border border-ok/30 bg-ok-soft/50 px-1.5 py-0.5 text-2xs text-ok">
                        <Paperclip className="size-3" /> {ev.id} — {ev.title}
                      </span>
                    ) : fired ? (
                      <span className="inline-flex items-center gap-1 rounded border border-medium/30 bg-medium-soft/50 px-1.5 py-0.5 text-2xs text-medium">
                        <BellRing className="size-3" /> {fired.kind === 'escalation' ? `Escalated · ${fired.intervalLabel} → ${fired.targetRole}` : `Reminder sent · ${fired.intervalLabel}`}
                      </span>
                    ) : (
                      <span className="text-2xs text-muted-foreground">Awaiting action — evidence not yet attached.</span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

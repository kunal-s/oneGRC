import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bot, Hand, Download, ShieldCheck, Layers, Activity, ArrowUpRight, CheckCircle2, XCircle, MinusCircle, ScrollText, Scale, Clock, CalendarClock, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { FrameworkPill } from '@/components/FrameworkPill'
import { EvidenceList } from '@/components/EvidenceList'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { SeverityBadge } from '@/components/SeverityBadge'
import { SourceList, SourceChip } from '@/components/SourceRef'
import { getIssue, getInstrument, WORLD } from '@/data'
import { clausesForControl } from '@/lib/sources'
import { controlLedger, filingTiming } from '@/lib/cycles'
import { personName, PEOPLE_BY_ID } from '@/data/people'
import { fmtDate, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveControl } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { ComingSoon } from './ComingSoon'
import type { Control, SourceProvision } from '@/types'

const RESULT_ICON = {
  Pass: <CheckCircle2 className="size-4 text-ok" />,
  Fail: <XCircle className="size-4 text-critical" />,
  Partial: <MinusCircle className="size-4 text-medium" />,
}

/** Group satisfied clauses by their act, preserving first-seen order. */
function groupByAct(clauses: SourceProvision[]): { instrumentId: string; clauses: SourceProvision[] }[] {
  const order: string[] = []
  const map = new Map<string, SourceProvision[]>()
  for (const c of clauses) {
    if (!map.has(c.instrumentId)) {
      map.set(c.instrumentId, [])
      order.push(c.instrumentId)
    }
    map.get(c.instrumentId)!.push(c)
  }
  return order.map((instrumentId) => ({ instrumentId, clauses: map.get(instrumentId)! }))
}

export function ControlDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const openDrawer = useApp((s) => s.openDrawer)
  const retestControl = useApp((s) => s.retestControl)
  const sessionTests = useApp((s) => (id ? s.controlTests[id] : undefined))
  const sessionControl = useApp((s) => s.getSessionControl(id ?? ''))
  const clauseOverrides = useApp((s) => s.clauseOverrides)
  const canRetest = useCanAct({ kind: 'control.retest' })
  const control = useEffectiveControl(id ?? '')
  const [tab, setTab] = React.useState('overview')

  if (!control) return <ComingSoon title="Control not found" />

  const evidence = WORLD.evidence.filter((e) => e.linkedControls.includes(control.id))
  const issues = control.linkedIssues.map((i) => getIssue(i)).filter(Boolean)
  const owner = PEOPLE_BY_ID[control.owner]
  // A control created this session from a clause has no operating history yet —
  // show only the tests actually recorded, never a fabricated back-history.
  const isNewlyCreated = Boolean(sessionControl)
  const testHistory = [...(sessionTests ?? []), ...(isNewlyCreated ? [] : buildTestHistory(control))]
  // Sources pipeline — the clauses (across acts) this control satisfies.
  const satisfied = clausesForControl(control.id, clauseOverrides)
  const satisfiedByAct = groupByAct(satisfied)
  // The obligations this control satisfies (control -> clause -> obligation), so a
  // user can walk control -> obligation -> evidence (E-E4).
  const satisfiedClauseIds = new Set(satisfied.map((c) => c.id))
  const obligationsSatisfied = WORLD.obligations.filter((o) => o.sourceRefs?.some((r) => satisfiedClauseIds.has(r)))
  // Period-by-period evidence ledger (E3.1).
  const ledger = controlLedger(control, evidence)

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'mappings', label: 'Mappings', count: control.frameworks.length },
    { key: 'history', label: 'Evidence ledger', count: ledger.length },
    { key: 'evidence', label: 'Evidence', count: evidence.length },
    { key: 'issues', label: 'Issues', count: issues.length },
  ]

  return (
    <div>
      <button
        onClick={() => navigate('/controls')}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Control Library
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{control.id}</span>
            {control.automation === 'CCM' ? (
              <span className="inline-flex items-center gap-1 rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok">
                <Bot className="size-3" /> CCM-automated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                <Hand className="size-3" /> Manual
              </span>
            )}
          </span>
        }
        title={control.title}
        description={control.description}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs">
              {RESULT_ICON[control.result]}
              <span className="font-medium text-foreground">{control.result}</span>
            </span>
            {control.automation === 'CCM' && control.ccmRuleId && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/ccm/${control.ccmRuleId}`)}>
                <Activity className="size-4" /> View CCM rule
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!canRetest}
              title={canRetest ? undefined : 'Recording a test is restricted to the Control Owner, Auditor or Executive.'}
              onClick={() => retestControl(control.id)}
            >
              Re-test
            </Button>
          </div>
        }
      />

      {/* map-once banner */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-info/30 bg-info-soft/40 px-3.5 py-2.5">
        <Layers className="size-4 text-info" />
        <span className="text-xs font-medium text-foreground">Map once, satisfy many —</span>
        <span className="text-xs text-muted-foreground">this single control satisfies</span>
        {control.mappedFrameworkRefs.map((m) => (
          <FrameworkPill key={m.framework} framework={m.framework} refText={m.ref} />
        ))}
        <span className="ml-auto text-2xs text-muted-foreground">tested once · {evidence.length} evidence items · counts in {control.frameworks.length} frameworks</span>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-4" />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="card-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Control attributes</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Attr label="Owner">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar id={control.owner} size={20} /> <span className="text-xs">{owner.name}</span>
                </span>
              </Attr>
              <Attr label="Line of defence">{owner.lod}</Attr>
              <Attr label="Type">{control.type}</Attr>
              <Attr label="Automation">{control.automation === 'CCM' ? 'Continuous (CCM)' : 'Manual'}</Attr>
              <Attr label="Cadence">{control.frequency}</Attr>
              <Attr label="Next due">{control.nextDue ? fmtDate(control.nextDue) : '—'}</Attr>
              <Attr label="Last tested">{fmtDate(control.lastTested)}</Attr>
              <Attr label="Result">
                <StatusChip status={control.result} />
              </Attr>
              <Attr label="Evidence items">{evidence.length}</Attr>
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Control activity — what must be done</div>
              <p className="mt-1 text-sm text-foreground">{control.description}</p>
            </div>
          </div>
          <div className="card-surface p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-ok" /> Risks mitigated
            </h3>
            {control.linkedRisks.length > 0 ? (
              <div className="space-y-1">
                {control.linkedRisks.slice(0, 6).map((rid) => (
                  <button
                    key={rid}
                    onClick={() => navigate(`/risks/${rid}`)}
                    className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
                  >
                    <span className="font-mono text-2xs font-semibold text-info">{rid}</span>
                    <ArrowUpRight className="ml-auto size-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No risks currently mapped to this control.</p>
            )}
            {control.sourceRefs && control.sourceRefs.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <ScrollText className="size-4 text-info" /> Source
                </h3>
                <SourceList ids={control.sourceRefs} />
                <p className="mt-2 text-2xs text-muted-foreground">
                  The standards this control is tested against — each mapping carries its instrument.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'overview' && (
        <div className="card-surface mt-4 p-4">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-info" /> Implementation &amp; assurance
          </h3>
          <p className="mb-3 text-2xs text-muted-foreground">How OneGRC verifies this control is implemented and operating — the checks an auditor relies on.</p>
          <div className="space-y-1.5">
            <CheckRow
              state="done"
              title="Design & ownership"
              detail={`Owned by ${owner.name} (${owner.lod}); satisfies ${satisfied.length} clause${satisfied.length === 1 ? '' : 's'} across ${satisfiedByAct.length} act${satisfiedByAct.length === 1 ? '' : 's'}.`}
            />
            <CheckRow
              state={testHistory.length ? 'done' : 'pending'}
              title="Control testing"
              detail={
                testHistory.length
                  ? `${control.automation === 'CCM' ? 'Continuous (CCM)' : 'Manual'} testing on a ${control.frequency} cadence — last result ${control.result} on ${fmtDate(control.lastTested)}; next due ${control.nextDue ? fmtDate(control.nextDue) : '—'}.`
                  : `Not yet tested. First ${control.automation === 'CCM' ? 'monitoring run' : 'test'} ${control.nextDue ? `due ${fmtDate(control.nextDue)}` : 'to be scheduled'}.`
              }
            />
            <CheckRow
              state={control.automation === 'CCM' ? 'done' : 'info'}
              title="Continuous monitoring"
              detail={control.automation === 'CCM' && control.ccmRuleId ? `Monitored continuously by CCM rule ${control.ccmRuleId}.` : 'Tested manually on its cadence — not continuously monitored.'}
            />
            <CheckRow
              state={evidence.length ? 'done' : 'pending'}
              title="Evidence of operation"
              detail={evidence.length ? `${evidence.length} evidence item${evidence.length === 1 ? '' : 's'} captured proving the control operated.` : 'No evidence captured yet — attach the first proof.'}
            />
            <CheckRow
              state="info"
              title="Independent audit"
              detail="Available for independent testing — an auditor pulls the proof from the evidence trail rather than chasing it across inboxes."
            />
          </div>
          {isNewlyCreated && testHistory.length === 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-medium/30 bg-medium-soft/40 px-3 py-2 text-2xs text-medium">
              <Clock className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1">Newly created from a clause — record the first test and attach evidence to move it from <span className="font-medium">designed</span> to <span className="font-medium">operating</span>.</span>
              {canRetest && (
                <Button size="sm" variant="outline" onClick={() => retestControl(control.id)}>
                  Record first test
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'overview' && satisfied.length > 0 && (
        <div className="card-surface mt-4 p-4">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Layers className="size-4 text-info" /> Satisfies — clauses across acts
          </h3>
          <p className="mb-3 text-2xs text-muted-foreground">
            {satisfied.length} clause{satisfied.length === 1 ? '' : 's'} from {satisfiedByAct.length} act{satisfiedByAct.length === 1 ? '' : 's'} are
            saved to this control — one control, many clauses across acts.
          </p>
          <div className="space-y-3">
            {satisfiedByAct.map(({ instrumentId, clauses }) => {
              const inst = getInstrument(instrumentId)
              return (
                <div key={instrumentId}>
                  <button onClick={() => inst && navigate(`/sources/${inst.id}`)} className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-info">
                    <Scale className="size-3.5 text-info" /> {inst?.title ?? instrumentId}
                    <span className="rounded bg-muted px-1 py-0 text-2xs font-medium text-muted-foreground">{inst?.authority}</span>
                  </button>
                  <div className="space-y-1">
                    {clauses.map((c) => (
                      <button key={c.id} onClick={() => navigate(`/sources/section/${c.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
                        <span className="font-mono text-2xs font-semibold text-info">{c.id}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.nameOfCompliance ?? c.title}</span>
                        {c.severity && <SeverityBadge severity={c.severity} dense />}
                        <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'overview' && obligationsSatisfied.length > 0 && (
        <div className="card-surface mt-4 p-4">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CalendarClock className="size-4 text-info" /> Obligations this control satisfies
          </h3>
          <p className="mb-3 text-2xs text-muted-foreground">
            The duties this control discharges — walk control &rarr; obligation &rarr; evidence to prove each period.
          </p>
          <div className="space-y-1">
            {obligationsSatisfied.map((o) => {
              const t = filingTiming(o)
              return (
                <button key={o.id} onClick={() => navigate(`/obligations/${o.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
                  <span className="font-mono text-2xs font-semibold text-info">{o.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{o.title}</span>
                  <StatusChip status={o.status} />
                  {o.status === 'Filed' && <span className={cn('rounded px-1.5 py-0 text-2xs font-medium', t === 'late' ? 'bg-medium-soft text-medium' : 'bg-ok-soft text-ok')}>{t === 'late' ? 'late' : 'on time'}</span>}
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'mappings' && (
        <div className="card-surface p-4">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Cross-framework mapping</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            One control, one test, one evidence trail — satisfying the equivalent clause in every framework SPF
            reports against. This is how “map once, satisfy many” removes duplicate testing.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {control.mappedFrameworkRefs.map((m) => (
              <div key={m.framework} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <FrameworkPill framework={m.framework} />
                <div className="min-w-0">
                  <div className="font-mono text-sm font-semibold text-foreground">{m.ref}</div>
                  <div className="text-2xs text-muted-foreground">{m.framework} clause satisfied by {control.id}</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {m.sourceRef && <SourceChip id={m.sourceRef} />}
                  <CheckCircle2 className="size-4 text-ok" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-2xs text-muted-foreground">
            Without unification this control would be tested {control.frameworks.length}× — once per framework. Here it
            is tested once and the result fans out to all {control.frameworks.length}.
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card-surface overflow-hidden">
          <div className="border-b border-border px-4 py-2.5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarClock className="size-4 text-info" /> Evidence ledger · period by period
            </h3>
            <p className="mt-0.5 text-2xs text-muted-foreground">For each cycle: what was due, the evidence filed, whether it was on time, and the result.</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2">Evidence filed</th>
                <th className="px-4 py-2">On time</th>
                <th className="px-4 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row, i) => (
                <tr key={i} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-2 text-xs text-foreground">{row.period}{i === 0 && <span className="ml-1 text-2xs text-muted-foreground">· current</span>}</td>
                  <td className="px-4 py-2 text-xs tnum text-muted-foreground">{fmtDate(row.dueDate)}</td>
                  <td className="px-4 py-2">
                    {row.evidenceId ? (
                      <button onClick={() => openDrawer({ kind: 'evidence-view', payload: { evidenceId: row.evidenceId } })} className="inline-flex items-center gap-1 rounded border border-ok/30 bg-ok-soft/50 px-1.5 py-0.5 text-2xs text-ok hover:underline">
                        <Paperclip className="size-3" /> {row.evidenceId} · {row.capturedAt ? fmtDate(row.capturedAt) : ''}
                      </button>
                    ) : (
                      <span className="text-2xs text-muted-foreground">— no evidence</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn('rounded px-1.5 py-0.5 text-2xs font-medium', row.timing === 'on-time' ? 'bg-ok-soft text-ok' : row.timing === 'late' ? 'bg-medium-soft text-medium' : 'bg-muted text-muted-foreground')}>
                      {row.timing === 'on-time' ? 'On time' : row.timing === 'late' ? 'Late' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-2"><StatusChip status={row.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="card-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Evidence ({evidence.length})</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground">
                {evidence.filter((e) => e.auto).length} auto-captured · {evidence.filter((e) => !e.auto).length} manual
              </span>
              <Button variant="outline" size="sm" onClick={() => openDrawer({ kind: 'evidence-upload', title: `Attach evidence — ${control.id}` })}>
                Attach evidence
              </Button>
            </div>
          </div>
          <EvidenceList items={evidence} />
        </div>
      )}

      {tab === 'issues' && (
        <div className="card-surface overflow-hidden">
          {issues.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2">Issue</th>
                  <th className="px-4 py-2">Severity</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Owner</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((iss) => (
                  <tr
                    key={iss!.id}
                    onClick={() => navigate(`/issues/${iss!.id}`)}
                    className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-info-soft/30"
                  >
                    <td className="px-4 py-2">
                      <span className="font-mono text-2xs font-semibold text-info">{iss!.id}</span>
                      <span className="ml-2 text-xs text-foreground">{iss!.title}</span>
                    </td>
                    <td className="px-4 py-2"><SeverityBadge severity={iss!.severity} dense /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{iss!.source}</td>
                    <td className="px-4 py-2 text-xs text-foreground">{personName(iss!.owner)}</td>
                    <td className="px-4 py-2"><StatusChip status={iss!.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No open issues — control operating effectively.
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDrawer({ kind: 'export-pdf', title: `Control sheet — ${control.id}`, payload: { filename: `${control.id}-control-sheet.pdf` } })}
        >
          <Download className="size-4" /> Export control sheet
        </Button>
      </div>
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

interface TestRun {
  at: string
  result: Control['result']
  method: string
  tester: string
  note: string
}

function CheckRow({ state, title, detail }: { state: 'done' | 'pending' | 'info'; title: string; detail: string }) {
  const icon =
    state === 'done' ? <CheckCircle2 className="size-4 text-ok" /> : state === 'pending' ? <Clock className="size-4 text-medium" /> : <MinusCircle className="size-4 text-muted-foreground" />
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-border bg-background px-3 py-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground">{title}</div>
        <div className="text-2xs leading-relaxed text-muted-foreground">{detail}</div>
      </div>
    </div>
  )
}

function buildTestHistory(control: Control): TestRun[] {
  const auto = control.automation === 'CCM'
  const method = auto ? `Automated (${control.frequency})` : 'Manual test'
  const tester = auto ? 'CCM (auto)' : personName(control.owner)
  const runs: TestRun[] = []
  const intervalDays = auto ? 7 : 30
  // most recent run reflects current result
  for (let i = 0; i < 6; i++) {
    const at = new Date(NOW_MS - i * intervalDays * 86400000 - (auto ? 0 : 3) * 3600000).toISOString()
    const result: Control['result'] = i === 0 ? control.result : i === 2 && control.result !== 'Pass' ? 'Partial' : 'Pass'
    runs.push({
      at,
      result,
      method,
      tester,
      note:
        i === 0
          ? control.result === 'Fail'
            ? 'Exceptions detected in population — issue auto-spawned'
            : control.result === 'Partial'
              ? 'Minor exceptions — remediation tracked'
              : 'No exceptions across population'
          : result === 'Pass'
            ? 'Passed — evidence auto-captured'
            : 'Exceptions cleared on re-test',
    })
  }
  return runs
}

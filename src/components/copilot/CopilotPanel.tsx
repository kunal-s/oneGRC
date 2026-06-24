import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowUpRight, ScrollText, FileText, ShieldCheck, CornerDownLeft, Bot, Check, CircleDot } from 'lucide-react'
import { Drawer } from '../Drawer'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { fmtRelative } from '@/lib/time'
import { buildRecordContext, type RecordContext } from '@/lib/copilot/context'
import { groundedResponder, type CopilotAnswer } from '@/lib/copilot/response'
import { clauseMappingRun, MAPPING_DEMO_CLAUSES, type AgentRunResult, type ProposedAction } from '@/lib/agents'

/** Pull a record id off the current route's last segment, if it is one we ground on. */
function entityFromPath(pathname: string): string | null {
  const last = pathname.split('/').filter(Boolean).pop() ?? ''
  return /^(RISK|CTRL|OBL|INC|POL|SRC)-/.test(last) ? last : null
}

const RECORD_ROUTE: Record<string, string> = {
  Clause: '/sources/section',
  Risk: '/risks',
  Control: '/controls',
  Obligation: '/obligations',
  Incident: '/incidents',
  Policy: '/policies',
}

const SUGGESTIONS: Record<string, string[]> = {
  Clause: ['What does this clause require?', "What's the penalty if it's missed?", 'Which control satisfies it?'],
  Risk: ['What controls mitigate this risk?', 'Why is the residual rating what it is?', 'Has this risk been realised?'],
  Control: ['Which frameworks does this satisfy?', 'When was it last tested?', 'What does it derive from?'],
  Obligation: ['What is the source of this duty?', 'What evidence proves it?', 'When is it next due?'],
  Incident: ['Which regulators must be notified?', 'What controls and risks does it touch?', 'What evidence is captured?'],
  Policy: ['Which controls enforce this policy?', 'What does it derive from?', 'When is it next reviewed?'],
}

interface Turn {
  q: string
  a: CopilotAnswer
}

export function CopilotPanel() {
  const open = useApp((s) => s.copilotOpen)
  const setOpen = useApp((s) => s.setCopilotOpen)
  const openDrawer = useApp((s) => s.openDrawer)
  const artifacts = useApp((s) => s.artifacts)
  const tab = useApp((s) => s.copilotTab)
  const setTab = useApp((s) => s.setCopilotTab)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const entityId = entityFromPath(pathname)
  const ctx: RecordContext | null = React.useMemo(() => (entityId ? buildRecordContext(entityId) : null), [entityId])

  const [turns, setTurns] = React.useState<Turn[]>([])
  const [draft, setDraft] = React.useState('')

  // Reset the thread whenever the grounding record changes.
  React.useEffect(() => {
    setTurns([])
    setDraft('')
  }, [entityId])

  const ask = (q: string) => {
    const question = q.trim()
    if (!question || !ctx) return
    setTurns((t) => [...t, { q: question, a: groundedResponder.ask(question, ctx) }])
    setDraft('')
  }

  const go = (route: string) => {
    setOpen(false)
    navigate(route)
  }

  const suggestions = ctx ? SUGGESTIONS[ctx.type] ?? [] : []

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      width="max-w-lg"
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-4 text-info" /> OneGRC Copilot
        </span>
      }
      subtitle="Grounded answers (Ask) and scripted, approve-to-apply runs (Agents)"
      footer={
        tab === 'ask' ? (
          <div className="flex w-full items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask(draft)}
              disabled={!ctx}
              placeholder={ctx ? `Ask about ${ctx.id}…` : 'Open a record to ask'}
              className="h-9 flex-1 rounded-md border border-border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-info/50 disabled:opacity-50"
            />
            <Button size="sm" disabled={!ctx || !draft.trim()} onClick={() => ask(draft)}>
              <CornerDownLeft className="size-4" /> Ask
            </Button>
          </div>
        ) : (
          <div className="w-full text-2xs text-muted-foreground">Runs are scripted and deterministic. Nothing changes until you approve a proposed action.</div>
        )
      }
    >
      {/* Ask | Agents tabs */}
      <div className="mb-3 flex items-center rounded-md border border-border p-0.5 text-xs">
        <TabBtn active={tab === 'ask'} onClick={() => setTab('ask')} icon={<Sparkles className="size-3.5" />} label="Ask" />
        <TabBtn active={tab === 'agents'} onClick={() => setTab('agents')} icon={<Bot className="size-3.5" />} label="Agents" />
      </div>

      {tab === 'agents' ? (
        <AgentsTab onNavigate={go} />
      ) : (
      <div className="space-y-4">
        {/* Grounding record */}
        {ctx ? (
          <div className="rounded-lg border border-info/30 bg-info-soft/40 p-3">
            <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-info">
              <ShieldCheck className="size-3.5" /> Grounded on {ctx.type}
            </div>
            <button onClick={() => go(`${RECORD_ROUTE[ctx.type] ?? ''}/${ctx.id}`)} className="mt-1 flex items-center gap-1.5 text-left">
              <span className="font-mono text-2xs font-semibold text-info">{ctx.id}</span>
              <span className="text-sm font-medium text-foreground">{ctx.title}</span>
            </button>
            <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">{ctx.summary}</p>
            <div className="mt-1.5 flex items-center gap-3 text-2xs text-muted-foreground">
              <span>{ctx.links.length} linked record{ctx.links.length === 1 ? '' : 's'}</span>
              <span>{ctx.sources.length} cited source{ctx.sources.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Open a <span className="font-medium text-foreground">clause, risk, control, obligation, incident or policy</span> to
            ask grounded questions about it — every answer cites the linked records and sources it draws from.
          </div>
        )}

        {/* Suggestions */}
        {ctx && turns.length === 0 && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-2xs text-foreground transition-colors hover:border-info/40 hover:bg-info-soft/40"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Thread */}
        {turns.map((t, i) => (
          <div key={i} className="space-y-1.5">
            <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground">{t.q}</div>
            <div className="rounded-lg rounded-bl-sm border border-border bg-muted/30 p-2.5">
              <p className="text-xs leading-relaxed text-foreground">{t.a.text}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', t.a.confidence === 'high' ? 'bg-ok-soft text-ok' : 'bg-medium-soft text-medium')}>
                  {t.a.confidence} confidence
                </span>
              </div>
              {/* citations */}
              {(t.a.sourceIds.length > 0 || t.a.citedIds.length > 0) && (
                <div className="mt-2 space-y-1 border-t border-border/70 pt-2">
                  {ctx?.sources.filter((s) => t.a.sourceIds.includes(s.id)).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openDrawer({ kind: 'source-viewer', title: s.documentTitle, payload: { sourceId: s.id } })}
                      className="group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-background"
                    >
                      <ScrollText className="size-3 shrink-0 text-info" />
                      <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{s.citation}</span>
                      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                  {ctx?.links.filter((l) => t.a.citedIds.includes(l.id)).slice(0, 6).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => go(l.route)}
                      className="group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-background"
                    >
                      <span className="rounded bg-muted px-1 py-0 text-[10px] text-muted-foreground">{l.relation}</span>
                      <span className="font-mono text-2xs font-semibold text-info">{l.id}</span>
                      <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">{l.label}</span>
                      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Artifacts */}
        <div className="border-t border-border pt-3">
          <div className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="size-3.5" /> Generated artifacts
            <span className="ml-auto font-normal normal-case">{artifacts.length} generated</span>
          </div>
          {artifacts.length === 0 ? (
            <p className="text-2xs text-muted-foreground">Generated reports and audit records appear here.</p>
          ) : (
            <div className="space-y-1">
              {[...artifacts].reverse().map((a) => {
                const filename = (a.payload as { filename?: string } | undefined)?.filename
                return (
                  <button
                    key={a.id}
                    onClick={() => openDrawer({ kind: 'export-pdf', title: a.title, payload: { filename: filename ?? `${a.id}.pdf` } })}
                    className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
                  >
                    <FileText className="size-3.5 shrink-0 text-info" />
                    <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{a.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{fmtRelative(a.createdAt)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      )}
    </Drawer>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
    >
      {icon} {label}
    </button>
  )
}

// The "Agents" tab — scripted, deterministic runs surfaced for human approval.
// E0.5.1 ships Run 2 (clause -> control mapping); the other runs land in E0.5.2/3.
function AgentsTab({ onNavigate }: { onNavigate: (route: string) => void }) {
  const agentScope = useApp((s) => s.agentScope)
  const clauseOverrides = useApp((s) => s.clauseOverrides)
  const sessionControls = useApp((s) => s.sessionControls)
  const recordAgentRun = useApp((s) => s.recordAgentRun)
  const approveAgentAction = useApp((s) => s.approveAgentAction)
  const canApprove = useCanAct({ kind: 'clause.save' })

  const [scope, setScope] = React.useState<string>(agentScope ?? MAPPING_DEMO_CLAUSES[0])
  React.useEffect(() => { if (agentScope) setScope(agentScope) }, [agentScope])

  const [phase, setPhase] = React.useState<'running' | 'done'>('running')
  const [applied, setApplied] = React.useState<Record<string, boolean>>({})

  const result: AgentRunResult | null = React.useMemo(
    () => clauseMappingRun(scope, clauseOverrides, sessionControls),
    [scope, clauseOverrides, sessionControls],
  )

  // Staged reveal, then record the run to the audit trail (once per scope).
  React.useEffect(() => {
    setPhase('running')
    setApplied({})
    const t = setTimeout(() => {
      setPhase('done')
      if (result) recordAgentRun(result)
    }, 750)
    return () => clearTimeout(t)
  }, [scope, result, recordAgentRun])

  const approve = (action: ProposedAction) => {
    if (!result) return
    approveAgentAction(result, action)
    setApplied((s) => ({ ...s, [action.id]: true }))
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-info/30 bg-info-soft/40 p-2.5 text-2xs text-muted-foreground">
        <span className="font-medium text-foreground">Clause → control mapping.</span> A scripted run reads a clause and proposes how to satisfy it — attach to an existing control or create a new one. You approve; nothing changes until you do.
      </div>

      {/* clause scope chips */}
      <div className="flex flex-wrap gap-1.5">
        {MAPPING_DEMO_CLAUSES.map((c) => (
          <button
            key={c}
            onClick={() => setScope(c)}
            className={cn('rounded-full border px-2.5 py-1 text-2xs font-mono font-semibold', scope === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-info hover:bg-info-soft/40')}
          >
            {c}
          </button>
        ))}
      </div>

      {!result ? (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">No clause in scope.</div>
      ) : (
        <>
          {/* steps */}
          <div className="rounded-lg border border-border p-3">
            <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{result.agent}</div>
            <ol className="space-y-1">
              {result.steps.map((st, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                  {phase === 'done' ? <Check className="size-3.5 text-ok" /> : <CircleDot className="size-3.5 animate-pulse text-info" />}
                  {st.label}
                </li>
              ))}
            </ol>
          </div>

          {phase === 'done' && (
            <>
              {/* findings */}
              <div className="rounded-lg border border-border p-3">
                <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Findings</div>
                <div className="space-y-1">
                  {result.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-2xs">
                      <span className="w-28 shrink-0 text-muted-foreground">{f.label}</span>
                      {f.route ? (
                        <button onClick={() => onNavigate(f.route!)} className="min-w-0 flex-1 truncate text-left font-medium text-info hover:underline">{f.value}</button>
                      ) : (
                        <span className="min-w-0 flex-1 text-foreground">{f.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* proposed actions */}
              <div className="space-y-1.5">
                <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Proposed actions · approve to apply</div>
                {result.proposedActions.map((a) => (
                  <div key={a.id} className={cn('rounded-lg border p-2.5', a.recommended ? 'border-info/40 bg-info-soft/30' : 'border-border bg-background')}>
                    <div className="flex items-center gap-2">
                      <Bot className="size-3.5 shrink-0 text-info" />
                      <span className="text-xs font-medium text-foreground">{a.label}</span>
                      {a.recommended && <span className="rounded bg-info-soft px-1.5 py-0 text-[10px] font-medium text-info">recommended</span>}
                      <span className="ml-auto inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-info" style={{ width: `${a.confidence}%` }} /></span>
                        <span className="text-[10px] font-semibold tnum text-info">{a.confidence}%</span>
                      </span>
                    </div>
                    <p className="mt-1 text-2xs text-muted-foreground">{a.detail}</p>
                    <div className="mt-1.5">
                      {applied[a.id] ? (
                        <span className="inline-flex items-center gap-1 rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok"><Check className="size-3" /> Applied</span>
                      ) : (
                        <Button size="sm" variant={a.recommended ? 'primary' : 'outline'} disabled={!canApprove} title={canApprove ? undefined : 'Approval is restricted to Compliance / the Company Secretary.'} onClick={() => approve(a)}>
                          Approve &amp; apply
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

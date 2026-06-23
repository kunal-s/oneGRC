import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowUpRight, ScrollText, FileText, ShieldCheck, CornerDownLeft } from 'lucide-react'
import { Drawer } from '../Drawer'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { fmtRelative } from '@/lib/time'
import { buildRecordContext, type RecordContext } from '@/lib/copilot/context'
import { groundedResponder, type CopilotAnswer } from '@/lib/copilot/response'

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
      subtitle="Grounded in this record's linked data and cited sources"
      footer={
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
      }
    >
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
    </Drawer>
  )
}

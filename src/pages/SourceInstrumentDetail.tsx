import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, ExternalLink, History, BookOpen, Building2, CheckCircle2, UserSearch,
  ShieldCheck, Sparkles, Gavel, ListChecks, ScrollText,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Button } from '@/components/ui/Button'
import { SaveClauseChooser } from '@/components/SaveClauseChooser'
import { getInstrument, getControl } from '@/data'
import { provisionsForInstrument, effectiveClause, statusTone, awaitingDecision } from '@/lib/sources'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { cn } from '@/lib/utils'
import type { SourceProvision } from '@/types'
import { ComingSoon } from './ComingSoon'

function severityRank(s: SourceProvision['severity']): number {
  return ['Low', 'Medium', 'High', 'Critical'].indexOf(s ?? 'Low')
}

export function SourceInstrumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const inst = id ? getInstrument(id) : undefined
  const overrides = useApp((s) => s.clauseOverrides)
  const engageSpecialist = useApp((s) => s.engageSpecialist)
  const pushToast = useApp((s) => s.pushToast)
  const canAct = useCanAct({ kind: 'clause.save' })
  const [saving, setSaving] = React.useState<SourceProvision | null>(null)

  const clauses = React.useMemo(
    () => (inst ? provisionsForInstrument(inst.id).map((p) => effectiveClause(p, overrides)) : []),
    [inst, overrides],
  )
  // Default selection: the first clause still awaiting a decision, else the first.
  const firstAwaiting = clauses.find((c) => c.applicable && c.status && awaitingDecision(c.status))
  const [selId, setSelId] = React.useState<string | undefined>(undefined)
  const selected = clauses.find((c) => c.id === selId) ?? firstAwaiting ?? clauses[0]

  if (!inst) return <ComingSoon title="Act not found" />

  const supersedes = inst.supersedesId ? getInstrument(inst.supersedesId) : undefined
  const supersededBy = inst.supersededById ? getInstrument(inst.supersededById) : undefined

  return (
    <div>
      <button onClick={() => navigate('/sources')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Source Library
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{inst.id}</span>
            <span className="rounded bg-info-soft px-1.5 py-0.5 text-2xs font-medium text-info">{inst.instrumentType}</span>
            <span className="text-muted-foreground">· {inst.authority}</span>
          </span>
        }
        title={inst.title}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={inst.status} tone={inst.status === 'In force' ? 'ok' : inst.status === 'Superseded' ? 'warn' : 'neutral'} />
            <a href={inst.sourceLink} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="size-4" /> Open source</Button>
            </a>
          </div>
        }
      />

      {supersededBy && (
        <button onClick={() => navigate(`/sources/${supersededBy.id}`)} className="mb-4 flex w-full items-center gap-2 rounded-lg border border-medium/40 bg-medium-soft/40 px-3.5 py-2.5 text-left transition-colors hover:bg-medium-soft/70">
          <History className="size-4 shrink-0 text-medium" />
          <span className="min-w-0 flex-1 text-sm text-foreground">Superseded by the newer version ({supersededBy.version} · {fmtDate(supersededBy.dateOfIssue)})</span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {/* Lead: what the act covers + how it affects SPF */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-surface p-4">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground"><BookOpen className="size-4 text-info" /> What this act covers</h3>
          <p className="text-sm leading-relaxed text-foreground">{inst.summary ?? `${inst.title} - see the clauses below.`}</p>
          {inst.version && supersedes && (
            <button onClick={() => navigate(`/sources/${supersedes.id}`)} className="mt-2 inline-flex items-center gap-1 text-2xs font-medium text-info hover:underline">
              {inst.version} · supersedes {supersedes.version} <ArrowUpRight className="size-3" />
            </button>
          )}
        </div>
        <div className="card-surface p-4">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Building2 className="size-4 text-info" /> How it affects SPF</h3>
          <p className="text-sm leading-relaxed text-foreground">{inst.applicability ?? 'Applicability under review.'}</p>
        </div>
      </div>

      {/* Master-detail clause reader (replaces the wide clause table) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Master: clause list */}
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-border px-3.5 py-2.5 text-sm font-semibold text-foreground">
            <ListChecks className="size-4 text-info" /> Clauses
            <span className="rounded-full bg-muted px-1.5 py-0 text-2xs tnum text-muted-foreground">{clauses.length}</span>
          </div>
          <div className="scrollbar-thin max-h-[640px] divide-y divide-border/70 overflow-y-auto">
            {clauses.map((c) => {
              const active = c.id === selected?.id
              return (
                <button
                  key={c.id}
                  onClick={() => setSelId(c.id)}
                  className={cn('flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors', active ? 'bg-info-soft/50' : 'hover:bg-muted/50')}
                >
                  {c.severity ? (
                    <span className={cn('mt-1 size-2 shrink-0 rounded-full', c.severity === 'Critical' ? 'bg-critical' : c.severity === 'High' ? 'bg-high' : c.severity === 'Medium' ? 'bg-medium' : 'bg-muted-foreground/50')} />
                  ) : (
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-muted-foreground/30" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">{c.nameOfCompliance ?? c.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
                      <span className="font-mono">{c.provision}</span>
                    </span>
                  </span>
                  {c.status ? <StatusChip status={c.status} tone={statusTone(c.status)} /> : <span className="text-2xs text-muted-foreground">Ref</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail: reading pane for the selected clause */}
        {selected ? <ClauseReader key={selected.id} clause={selected} canAct={canAct} onSave={() => setSaving(selected)} onSpecialist={() => { engageSpecialist(selected.id); pushToast({ title: 'Specialist engaged', description: `${selected.id} routed to outside counsel for review.`, variant: 'info' }) }} /> : null}
      </div>

      {saving && <SaveClauseChooser clause={saving} onClose={() => setSaving(null)} />}
    </div>
  )
}

function ClauseReader({
  clause: c,
  canAct,
  onSave,
  onSpecialist,
}: {
  clause: SourceProvision
  canAct: boolean
  onSave: () => void
  onSpecialist: () => void
}) {
  const navigate = useNavigate()
  const linked = c.linkedControlId ? getControl(c.linkedControlId) : undefined
  const tiers = (c.penaltyTiers ?? []).slice().sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
  const awaiting = c.applicable && c.status && awaitingDecision(c.status)

  return (
    <div className="card-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        {c.severity && <SeverityBadge severity={c.severity} />}
        {c.status && <StatusChip status={c.status} tone={statusTone(c.status)} />}
        {c.applicable === false && <StatusChip status="Not applicable" tone="neutral" />}
        <span className="ml-auto font-mono text-2xs text-muted-foreground">{c.id}</span>
      </div>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{c.nameOfCompliance ?? c.title}</h2>
      <div className="mt-0.5 text-xs text-muted-foreground">{c.provision}</div>

      {c.whatItMeans && <p className="mt-3 text-sm leading-relaxed text-foreground">{c.whatItMeans}</p>}

      {c.keyParts && c.keyParts.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Key parts</div>
          <ul className="space-y-1">
            {c.keyParts.map((k, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-info" /> {k}</li>
            ))}
          </ul>
        </div>
      )}

      {c.sourceExtract && (
        <div className="mt-3">
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Clause extract</div>
          <blockquote className="border-l-2 border-info/50 bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-foreground">"{c.sourceExtract}"</blockquote>
          <div className="mt-1 text-2xs text-muted-foreground">{c.citation}</div>
        </div>
      )}

      {tiers.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground"><Gavel className="size-3.5" /> What happens if missed</div>
          <div className="space-y-1">
            {tiers.map((t, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
                <SeverityBadge severity={t.severity} dense />
                <span className="min-w-0 flex-1 text-xs text-foreground"><span className="text-muted-foreground">{t.trigger}: </span>{t.consequence}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {c.aiRecommendation && (
        <div className="mt-3 rounded-lg border border-info/30 bg-info-soft/40 p-3">
          <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-info"><Sparkles className="size-3.5" /> Recommendation · {c.aiRecommendation.agent} · {c.aiRecommendation.confidence.toFixed(1)}%</div>
          <p className="mt-1 text-sm text-foreground">{c.aiRecommendation.recommendation}</p>
        </div>
      )}

      {/* Decision / linkage */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {c.status === 'Saved' && linked ? (
          <Button size="sm" onClick={() => navigate(`/controls/${linked.id}`)}><ShieldCheck className="size-4" /> {linked.id} · view control</Button>
        ) : awaiting && canAct ? (
          <>
            <Button size="sm" onClick={onSave}><CheckCircle2 className="size-4" /> Save to a control</Button>
            {c.status !== 'Specialist review' && (
              <Button variant="outline" size="sm" onClick={onSpecialist}><UserSearch className="size-4" /> Engage specialist</Button>
            )}
          </>
        ) : awaiting && !canAct ? (
          <span className="text-2xs text-muted-foreground">Accepting a clause is restricted to the Compliance Manager persona.</span>
        ) : null}
        <button onClick={() => navigate(`/sources/section/${c.id}`)} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-info hover:underline">
          <ScrollText className="size-3.5" /> Open full clause detail
        </button>
      </div>
    </div>
  )
}

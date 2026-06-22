import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, Scale, ExternalLink, History, ChevronRight, BookOpen, Building2,
  CheckCircle2, UserSearch, ShieldCheck,
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
import type { SourceProvision } from '@/types'
import { ComingSoon } from './ComingSoon'

export function SourceInstrumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const inst = id ? getInstrument(id) : undefined
  const overrides = useApp((s) => s.clauseOverrides)
  const engageSpecialist = useApp((s) => s.engageSpecialist)
  const pushToast = useApp((s) => s.pushToast)
  const [saving, setSaving] = React.useState<SourceProvision | null>(null)

  if (!inst) return <ComingSoon title="Act not found" />

  const clauses = provisionsForInstrument(inst.id).map((p) => effectiveClause(p, overrides))
  const supersedes = inst.supersedesId ? getInstrument(inst.supersedesId) : undefined
  const supersededBy = inst.supersededById ? getInstrument(inst.supersededById) : undefined
  const canAct = useCanAct({ kind: 'clause.save' })

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
          <p className="text-sm leading-relaxed text-foreground">{inst.summary ?? `${inst.title} — see the clauses below.`}</p>
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

      {/* Clause breakdown */}
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Scale className="size-4 text-info" /> Clauses · {clauses.length}
      </h3>
      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Clause</th>
              <th className="px-3 py-2">Name of compliance</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">What it means</th>
              <th className="px-3 py-2">Penalty</th>
              <th className="px-3 py-2">When due</th>
              <th className="px-3 py-2">Applicability</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {clauses.map((c) => {
              const topTier = (c.penaltyTiers ?? []).slice().sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0]
              const linked = c.linkedControlId ? getControl(c.linkedControlId) : undefined
              return (
                <tr key={c.id} className="border-b border-border align-top text-sm last:border-0 hover:bg-info-soft/30">
                  <td className="cursor-pointer px-3 py-2.5" onClick={() => navigate(`/sources/section/${c.id}`)}>
                    <div className="font-medium text-foreground">{c.title}</div>
                    <div className="font-mono text-2xs text-muted-foreground">{c.id}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{c.nameOfCompliance ?? <span className="text-muted-foreground">Reference</span>}</td>
                  <td className="max-w-[180px] px-3 py-2.5 text-xs text-muted-foreground"><span className="line-clamp-2">{c.briefDescription ?? '—'}</span></td>
                  <td className="max-w-[220px] px-3 py-2.5 text-xs text-foreground"><span className="line-clamp-2">{c.whatItMeans ?? '—'}</span></td>
                  <td className="max-w-[180px] px-3 py-2.5">
                    {topTier ? (
                      <span className="inline-flex flex-col gap-0.5">
                        <SeverityBadge severity={topTier.severity} dense />
                        <span className="line-clamp-1 text-2xs text-muted-foreground">{topTier.consequence}</span>
                      </span>
                    ) : (
                      <span className="text-2xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs tnum text-muted-foreground">{c.nextDue ? fmtDate(c.nextDue) : c.frequency ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    {c.applicable === undefined ? (
                      <span className="text-2xs text-muted-foreground">—</span>
                    ) : c.applicable ? (
                      <StatusChip status="Applicable" tone="ok" />
                    ) : (
                      <StatusChip status="Not applicable" tone="neutral" />
                    )}
                  </td>
                  <td className="px-3 py-2.5">{c.status ? <StatusChip status={c.status} tone={statusTone(c.status)} /> : <span className="text-2xs text-muted-foreground">Reference</span>}</td>
                  <td className="px-3 py-2.5 text-right">
                    {c.status === 'Saved' && linked ? (
                      <button onClick={() => navigate(`/controls/${linked.id}`)} className="inline-flex items-center gap-1 rounded bg-ok-soft px-1.5 py-1 text-2xs font-medium text-ok hover:bg-ok-soft/70" title={linked.title}>
                        <ShieldCheck className="size-3" /> {linked.id}
                      </button>
                    ) : c.applicable && c.status && awaitingDecision(c.status) && canAct ? (
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <button onClick={() => setSaving(c)} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-2xs font-medium text-foreground hover:border-info/40 hover:bg-info-soft/40">
                          <CheckCircle2 className="size-3" /> Save
                        </button>
                        {c.status !== 'Specialist review' && (
                          <button onClick={() => { engageSpecialist(c.id); pushToast({ title: 'Specialist engaged', description: `${c.id} sent for specialist review (mocked — pending backend).`, variant: 'info' }) }} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-2xs font-medium text-foreground hover:border-info/40 hover:bg-info-soft/40">
                            <UserSearch className="size-3" /> Specialist
                          </button>
                        )}
                      </span>
                    ) : (
                      <ChevronRight className="ml-auto size-4 cursor-pointer text-muted-foreground" onClick={() => navigate(`/sources/section/${c.id}`)} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-2xs text-muted-foreground">Open a clause for the full detail, the penalty tiers and the recommendation. Save maps a clause to a control; Specialist kicks a mocked review.</p>

      {saving && <SaveClauseChooser clause={saving} onClose={() => setSaving(null)} />}
    </div>
  )
}

function severityRank(s: SourceProvision['severity']): number {
  return ['Low', 'Medium', 'High', 'Critical'].indexOf(s ?? 'Low')
}

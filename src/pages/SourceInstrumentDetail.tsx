import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, ExternalLink, History, BookOpen, Building2, ListChecks,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Button } from '@/components/ui/Button'
import { getInstrument } from '@/data'
import { provisionsForInstrument, effectiveClause, statusTone, awaitingDecision } from '@/lib/sources'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
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

  const clauses = inst ? provisionsForInstrument(inst.id).map((p) => effectiveClause(p, overrides)) : []

  if (!inst) return <ComingSoon title="Act not found" />

  const supersedes = inst.supersedesId ? getInstrument(inst.supersedesId) : undefined
  const supersededBy = inst.supersededById ? getInstrument(inst.supersededById) : undefined
  const awaitingCount = clauses.filter((c) => c.applicable && c.status && awaitingDecision(c.status)).length
  const savedCount = clauses.filter((c) => c.status === 'Saved').length

  const columns: Column<SourceProvision>[] = [
    {
      key: 'name',
      header: 'Compliance',
      sortValue: (c) => c.nameOfCompliance ?? c.title,
      className: 'max-w-[220px]',
      render: (c) => <span className="block truncate text-sm font-medium text-foreground">{c.nameOfCompliance ?? c.title}</span>,
    },
    {
      key: 'section',
      header: 'Section',
      sortValue: (c) => c.provision,
      render: (c) => <span className="whitespace-nowrap font-mono text-2xs text-info">{c.provision}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      sortValue: (c) => c.briefDescription ?? '',
      className: 'max-w-[260px]',
      render: (c) => <span className="block truncate text-xs text-muted-foreground" title={c.briefDescription}>{c.briefDescription ?? '—'}</span>,
    },
    {
      key: 'keyParts',
      header: 'Key parts',
      align: 'right',
      sortValue: (c) => c.keyParts?.length ?? 0,
      render: (c) =>
        c.keyParts?.length ? (
          <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground" title={c.keyParts.join(' · ')}>
            <ListChecks className="size-3" /> {c.keyParts.length}
          </span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'penalty',
      header: 'Penalty tiers',
      className: 'max-w-[220px]',
      sortValue: (c) => c.penaltyTiers?.length ?? 0,
      render: (c) => {
        const top = (c.penaltyTiers ?? []).slice().sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0]
        return top ? (
          <span className="block truncate text-2xs text-muted-foreground" title={top.consequence}>{top.consequence}</span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        )
      },
    },
    {
      key: 'severity',
      header: 'Severity',
      sortValue: (c) => severityRank(c.severity),
      render: (c) => (c.severity ? <SeverityBadge severity={c.severity} dense /> : <span className="text-2xs text-muted-foreground">—</span>),
    },
    {
      key: 'frequency',
      header: 'Frequency',
      sortValue: (c) => c.frequency ?? '',
      render: (c) => <span className="whitespace-nowrap text-xs text-muted-foreground">{c.frequency ?? '—'}</span>,
    },
    {
      key: 'due',
      header: 'Due',
      sortValue: (c) => (c.nextDue ? new Date(c.nextDue).getTime() : Infinity),
      render: (c) => <span className="whitespace-nowrap text-xs text-muted-foreground">{c.nextDue ? fmtDate(c.nextDue) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (c) => c.status ?? 'zz',
      render: (c) => (c.status ? <StatusChip status={c.status} tone={statusTone(c.status)} /> : <span className="text-2xs text-muted-foreground">Ref</span>),
    },
  ]

  const statusOptions = Array.from(new Set(clauses.map((c) => c.status).filter(Boolean))) as string[]
  const filters: TableFilter<SourceProvision>[] = [
    { key: 'status', label: 'Status', options: statusOptions, predicate: (c, v) => c.status === v },
    { key: 'severity', label: 'Severity', options: ['Critical', 'High', 'Medium', 'Low'], predicate: (c, v) => c.severity === v },
  ]

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

      {/* Clause table — every field in one view; click a row to open the clause and its review workflow */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1">
          <ListChecks className="size-3.5 text-muted-foreground" /> {clauses.length} clauses
        </span>
        {awaitingCount > 0 && <span className="rounded-md border border-medium/30 bg-medium-soft px-2.5 py-1 text-medium">{awaitingCount} awaiting decision</span>}
        <span className="rounded-md border border-border bg-background px-2.5 py-1">Saved to control <span className="font-semibold tnum text-foreground">{savedCount}</span></span>
        <span className="ml-auto text-2xs text-muted-foreground">Open a clause for its extract, penalty tiers and the save / specialist / Copilot workflow</span>
      </div>
      <DataTable
        data={clauses}
        columns={columns}
        searchKeys={['id', (c) => c.nameOfCompliance ?? c.title, 'provision', (c) => c.briefDescription ?? '']}
        searchPlaceholder="Search clause, section or description…"
        filters={filters}
        initialSort={{ key: 'section', dir: 'asc' }}
        onRowClick={(c) => navigate(`/sources/section/${c.id}`)}
      />
    </div>
  )
}

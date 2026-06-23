import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Download, Network } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { ScoreBadge, scoreBand } from '@/components/RiskScore'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { WORLD } from '@/data'
import { personName } from '@/data/people'
import { residualCell, DOMAIN_COLORS, DOMAIN_LABELS } from '@/lib/heatmap'
import { useApp } from '@/store'
import { ReportMenu } from '@/components/kit/ReportMenu'
import { reportsForModule } from '@/components/kit/reports'
import type { Risk, RiskDomain } from '@/types'

const TREATMENTS = ['Mitigate', 'Accept', 'Transfer', 'Avoid']
const RESIDUAL_BANDS = ['Critical', 'High', 'Medium', 'Low']

function DomainChip({ domain }: { domain: RiskDomain }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
      <span className="size-2 rounded-full" style={{ background: DOMAIN_COLORS[domain] }} />
      {domain === 'ThirdParty' ? 'Third-party' : domain}
    </span>
  )
}

export function RiskRegister() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const [params, setParams] = useSearchParams()

  const likelihood = params.get('likelihood')
  const impact = params.get('impact')
  const cellFilter = likelihood && impact ? { l: Number(likelihood), i: Number(impact) } : null

  const risks = React.useMemo(() => {
    if (!cellFilter) return WORLD.risks
    return WORLD.risks.filter((r) => {
      const c = residualCell(r)
      return c.likelihood === cellFilter.l && c.impact === cellFilter.i
    })
  }, [cellFilter])

  const owners = React.useMemo(
    () => Array.from(new Set(WORLD.risks.map((r) => r.owner))).map((id) => personName(id)).sort(),
    [],
  )

  const domainCounts = React.useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of WORLD.risks) c[r.domain] = (c[r.domain] ?? 0) + 1
    return c
  }, [])

  const columns: Column<Risk>[] = [
    {
      key: 'id',
      header: 'Risk ID',
      sortValue: (r) => r.id,
      render: (r) => <span className="font-mono text-xs font-semibold text-info">{r.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (r) => r.title,
      className: 'max-w-[340px]',
      render: (r) => <span className="block truncate text-sm text-foreground">{r.title}</span>,
    },
    {
      key: 'domain',
      header: 'Domain',
      sortValue: (r) => r.domain,
      render: (r) => <DomainChip domain={r.domain} />,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (r) => personName(r.owner),
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={r.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(r.owner)}</span>
        </span>
      ),
    },
    {
      key: 'inherent',
      header: 'Inherent',
      align: 'center',
      sortValue: (r) => r.inherent,
      render: (r) => <ScoreBadge score={r.inherent} hollow />,
    },
    {
      key: 'residual',
      header: 'Residual',
      align: 'center',
      sortValue: (r) => r.residual,
      render: (r) => <ScoreBadge score={r.residual} />,
    },
    {
      key: 'treatment',
      header: 'Treatment',
      sortValue: (r) => r.treatment,
      render: (r) => <StatusChip status={r.treatment} tone={r.treatment === 'Accept' ? 'neutral' : 'info'} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      render: (r) => <StatusChip status={r.status} />,
    },
  ]

  const filters: TableFilter<Risk>[] = [
    {
      key: 'domain',
      label: 'Domain',
      options: DOMAIN_LABELS.map((d) => (d.key === 'ThirdParty' ? 'Third-party' : d.key)),
      predicate: (r, v) => (v === 'Third-party' ? r.domain === 'ThirdParty' : r.domain === v),
    },
    { key: 'owner', label: 'Owner', options: owners, predicate: (r, v) => personName(r.owner) === v },
    {
      key: 'residual',
      label: 'Residual',
      options: RESIDUAL_BANDS,
      predicate: (r, v) => scoreBand(r.residual) === v,
    },
    { key: 'treatment', label: 'Treatment', options: TREATMENTS, predicate: (r, v) => r.treatment === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Risk & Control"
        title="Risk Register"
        description={
          <>
            IT and enterprise risk in <span className="font-medium text-foreground">one register</span> — every
            risk a shared object linking the controls, incidents and issues that touch it. {WORLD.risks.length} risks
            across six domains, scored inherent vs residual.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <ReportMenu templates={reportsForModule('Risk')} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToast({ title: 'Risk Register exported', description: 'risk-register-jun-2026.csv.', variant: 'success' })}
            >
              <Download className="size-4" />
              Export
            </Button>
          </div>
        }
      />

      {/* Domain summary — "one register across domains" */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          <Network className="size-3.5" /> One register
        </span>
        {DOMAIN_LABELS.map((d) => (
          <span
            key={d.key}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <span className="size-2 rounded-full" style={{ background: DOMAIN_COLORS[d.key] }} />
            <span className="text-foreground">{d.label}</span>
            <span className="font-semibold tnum text-muted-foreground">{domainCounts[d.key] ?? 0}</span>
          </span>
        ))}
      </div>

      {cellFilter && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-info/30 bg-info-soft/50 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">
            Filtered from heat map — residual likelihood {cellFilter.l} × impact {cellFilter.i} ({risks.length}{' '}
            {risks.length === 1 ? 'risk' : 'risks'})
          </span>
          <button
            onClick={() => setParams({})}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" /> Clear
          </button>
        </div>
      )}

      <DataTable
        data={risks}
        columns={columns}
        searchKeys={['id', 'title', (r) => personName(r.owner)]}
        searchPlaceholder="Search risk id, title or owner…"
        filters={filters}
        initialSort={{ key: 'residual', dir: 'desc' }}
        onRowClick={(r) => navigate(`/risks/${r.id}`)}
        rightSlot={
          <span className="text-2xs text-muted-foreground">
            sorted by residual ·{' '}
            <span className={cn('font-medium', 'text-critical')}>
              {risks.filter((r) => scoreBand(r.residual) === 'Critical').length} critical
            </span>
          </span>
        }
      />
    </div>
  )
}

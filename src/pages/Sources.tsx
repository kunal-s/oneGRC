import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, ScrollText, FileText, AlertTriangle, UserSearch, Download, History } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { KpiTile } from '@/components/KpiTile'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { WORLD } from '@/data'
import { instrumentSummary, type InstrumentSummary } from '@/lib/sources'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import type { SourceInstrument } from '@/types'

interface Row {
  id: string
  inst: SourceInstrument
  summary: InstrumentSummary
  updated: number
}

export function Sources() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const overrides = useApp((s) => s.reviewOverrides)

  const rows: Row[] = React.useMemo(
    () =>
      WORLD.instruments.map((inst) => ({
        id: inst.id,
        inst,
        summary: instrumentSummary(inst.id, overrides),
        updated: new Date(inst.dateOfIssue).getTime(),
      })),
    [overrides],
  )

  const authorities = React.useMemo(
    () => Array.from(new Set(WORLD.instruments.map((i) => i.authority))).sort(),
    [],
  )
  const types = React.useMemo(
    () => Array.from(new Set(WORLD.instruments.map((i) => i.instrumentType))).sort(),
    [],
  )

  const totalProvisions = WORLD.sources.length
  const obligationsDerived = new Set(
    WORLD.sources.flatMap((s) => s.review?.recommendedObligationIds ?? []),
  ).size
  const needsReview = rows.reduce((n, r) => n + r.summary.needsReview, 0)
  const needsExpert = rows.reduce((n, r) => n + r.summary.needsExpert, 0)

  const columns: Column<Row>[] = [
    {
      key: 'instrument',
      header: 'Instrument',
      sortValue: (r) => r.inst.title,
      className: 'max-w-[320px]',
      render: (r) => (
        <span className="block">
          <span className="block truncate text-sm font-medium text-foreground">{r.inst.title}</span>
          <span className="font-mono text-2xs text-muted-foreground">{r.inst.id}</span>
        </span>
      ),
    },
    {
      key: 'authority',
      header: 'Authority',
      sortValue: (r) => r.inst.authority,
      render: (r) => <span className="text-xs text-foreground">{r.inst.authority}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortValue: (r) => r.inst.instrumentType,
      render: (r) => (
        <span className="rounded bg-info-soft px-1.5 py-0.5 text-2xs font-medium text-info">{r.inst.instrumentType}</span>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      sortValue: (r) => r.inst.version ?? '',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-xs tnum text-foreground">{r.inst.version ?? '—'}</span>
          {r.inst.status === 'Superseded' && (
            <span className="inline-flex items-center gap-0.5 rounded bg-medium-soft px-1 py-0.5 text-2xs font-medium text-medium">
              <History className="size-2.5" /> superseded
            </span>
          )}
          {r.inst.supersedesId && (
            <span className="rounded bg-ok-soft px-1 py-0.5 text-2xs font-medium text-ok" title="Newest version">
              current
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'provisions',
      header: 'Provisions',
      align: 'right',
      sortValue: (r) => r.summary.provisions,
      render: (r) => <span className="text-xs tnum text-foreground">{r.summary.provisions}</span>,
    },
    {
      key: 'obligations',
      header: 'Obligations',
      align: 'right',
      sortValue: (r) => r.summary.obligations,
      render: (r) => <span className="text-xs tnum text-foreground">{r.summary.obligations || '—'}</span>,
    },
    {
      key: 'review',
      header: 'Needs review',
      align: 'right',
      sortValue: (r) => r.summary.needsReview,
      render: (r) =>
        r.summary.needsReview > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded bg-medium-soft px-1.5 py-0.5 text-2xs font-semibold text-medium">{r.summary.needsReview}</span>
            {r.summary.needsExpert > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded bg-critical-soft px-1 py-0.5 text-2xs font-medium text-critical" title="Needs expert opinion">
                <UserSearch className="size-2.5" /> {r.summary.needsExpert}
              </span>
            )}
          </span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.inst.status,
      render: (r) => <StatusChip status={r.inst.status} tone={r.inst.status === 'In force' ? 'ok' : r.inst.status === 'Superseded' ? 'warn' : 'neutral'} />,
    },
    {
      key: 'updated',
      header: 'Issued',
      sortValue: (r) => r.updated,
      render: (r) => <span className="text-xs tnum text-muted-foreground">{fmtDate(r.inst.dateOfIssue)}</span>,
    },
  ]

  const filters: TableFilter<Row>[] = [
    { key: 'authority', label: 'Authority', options: authorities, predicate: (r, v) => r.inst.authority === v },
    { key: 'type', label: 'Type', options: types, predicate: (r, v) => r.inst.instrumentType === v },
    { key: 'status', label: 'Status', options: ['In force', 'Superseded', 'Draft', 'Repealed'], predicate: (r, v) => r.inst.status === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Source Library"
        description={
          <>
            <span className="font-medium text-foreground">The instruments behind the obligations.</span>{' '}
            {WORLD.instruments.length} legal instruments and {totalProvisions} pinned provisions — each provision shows
            the obligations the ingestion process recommends, for Compliance to confirm applicability.
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Source register exported', description: 'source-library-register.csv.', variant: 'success' })}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile label="Instruments" value={WORLD.instruments.length} icon={<Scale className="size-4" />} tone="info" />
        <KpiTile label="Provisions pinned" value={totalProvisions} icon={<ScrollText className="size-4" />} />
        <KpiTile label="Obligations derived" value={obligationsDerived} icon={<FileText className="size-4" />} />
        <KpiTile label="Needs review" value={needsReview} icon={<AlertTriangle className="size-4" />} tone={needsReview > 0 ? 'warn' : 'neutral'} />
        <KpiTile label="Expert opinion" value={needsExpert} icon={<UserSearch className="size-4" />} tone={needsExpert > 0 ? 'danger' : 'neutral'} />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.inst.id}
        searchKeys={[(r) => r.inst.title, (r) => r.inst.id, (r) => r.inst.authority]}
        searchPlaceholder="Search instrument, id or authority…"
        filters={filters}
        initialSort={{ key: 'review', dir: 'desc' }}
        onRowClick={(r) => navigate(`/sources/${r.inst.id}`)}
      />
    </div>
  )
}

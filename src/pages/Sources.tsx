import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, ScrollText, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { KpiTile } from '@/components/KpiTile'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { WORLD } from '@/data'
import { instrumentSummary, actStatus, type InstrumentSummary } from '@/lib/sources'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import type { SourceInstrument } from '@/types'

interface Row {
  id: string
  inst: SourceInstrument
  summary: InstrumentSummary
  act?: 'Processing' | 'In review' | 'Tracked'
  updated: number
}

const ACT_TONE = { Processing: 'progress', 'In review': 'warn', Tracked: 'ok' } as const

export function Sources() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const overrides = useApp((s) => s.clauseOverrides)

  const rows: Row[] = React.useMemo(
    () =>
      WORLD.instruments.map((inst) => ({
        id: inst.id,
        inst,
        summary: instrumentSummary(inst.id, overrides),
        act: actStatus(inst.id, overrides),
        updated: new Date(inst.dateOfIssue).getTime(),
      })),
    [overrides],
  )

  const authorities = React.useMemo(() => Array.from(new Set(WORLD.instruments.map((i) => i.authority))).sort(), [])
  const types = React.useMemo(() => Array.from(new Set(WORLD.instruments.map((i) => i.instrumentType))).sort(), [])

  const totalClauses = WORLD.sources.length
  const awaiting = rows.reduce((n, r) => n + r.summary.awaiting, 0)
  const saved = rows.reduce((n, r) => n + r.summary.saved, 0)

  const columns: Column<Row>[] = [
    {
      key: 'instrument',
      header: 'Act / instrument',
      sortValue: (r) => r.inst.title,
      className: 'max-w-[360px]',
      render: (r) => (
        <span className="block">
          <span className="block truncate text-sm font-medium text-foreground">{r.inst.title}</span>
          <span className="font-mono text-2xs text-muted-foreground">{r.inst.id}</span>
        </span>
      ),
    },
    { key: 'authority', header: 'Authority', sortValue: (r) => r.inst.authority, render: (r) => <span className="text-xs text-foreground">{r.inst.authority}</span> },
    {
      key: 'type',
      header: 'Type',
      sortValue: (r) => r.inst.instrumentType,
      render: (r) => <span className="rounded bg-info-soft px-1.5 py-0.5 text-2xs font-medium text-info">{r.inst.instrumentType}</span>,
    },
    { key: 'clauses', header: 'Clauses', align: 'right', sortValue: (r) => r.summary.clauses, render: (r) => <span className="text-xs tnum text-foreground">{r.summary.clauses}</span> },
    {
      key: 'awaiting',
      header: 'Awaiting',
      align: 'right',
      sortValue: (r) => r.summary.awaiting,
      render: (r) =>
        r.summary.awaiting > 0 ? (
          <span className="rounded bg-medium-soft px-1.5 py-0.5 text-2xs font-semibold text-medium">{r.summary.awaiting}</span>
        ) : r.summary.saved > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-2xs text-ok"><CheckCircle2 className="size-3" /> tracked</span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.act ?? 'zz',
      render: (r) => (r.act ? <StatusChip status={r.act} tone={ACT_TONE[r.act]} /> : <span className="text-2xs text-muted-foreground">Reference</span>),
    },
    { key: 'updated', header: 'Last updated', sortValue: (r) => r.updated, render: (r) => <span className="text-xs tnum text-muted-foreground">{fmtDate(r.inst.dateOfIssue)}</span> },
  ]

  const filters: TableFilter<Row>[] = [
    { key: 'authority', label: 'Authority', options: authorities, predicate: (r, v) => r.inst.authority === v },
    { key: 'type', label: 'Type', options: types, predicate: (r, v) => r.inst.instrumentType === v },
    { key: 'status', label: 'Status', options: ['Processing', 'In review', 'Tracked'], predicate: (r, v) => r.act === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Source Library"
        description={
          <>
            <span className="font-medium text-foreground">The acts behind the controls.</span> {WORLD.instruments.length}{' '}
            instruments broken into {totalClauses} clauses — open an act to read what it covers, how it affects SPF, and
            save each clause to a control.
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Source register exported', description: 'source-library-register.csv.', variant: 'success' })}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Acts" value={WORLD.instruments.length} icon={<Scale className="size-4" />} tone="info" />
        <KpiTile label="Clauses" value={totalClauses} icon={<ScrollText className="size-4" />} />
        <KpiTile label="Awaiting decision" value={awaiting} icon={<AlertTriangle className="size-4" />} tone={awaiting > 0 ? 'warn' : 'neutral'} />
        <KpiTile label="Saved to controls" value={saved} icon={<CheckCircle2 className="size-4" />} tone="ok" />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.inst.id}
        searchKeys={[(r) => r.inst.title, (r) => r.inst.id, (r) => r.inst.authority]}
        searchPlaceholder="Search act, id or authority…"
        filters={filters}
        initialSort={{ key: 'awaiting', dir: 'desc' }}
        onRowClick={(r) => navigate(`/sources/${r.inst.id}`)}
      />
    </div>
  )
}

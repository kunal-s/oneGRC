import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Users, Database, Radio } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { WORLD } from '@/data'
import { fmtIST, fmtRelative } from '@/lib/time'
import { useApp } from '@/store'
import { ReportMenu } from '@/components/kit/ReportMenu'
import { reportsForModule } from '@/components/kit/reports'
import type { Incident, Severity } from '@/types'

const SEV_ORDER: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
const STATUS_OPTIONS = ['Open', 'Contained', 'Eradicated', 'Closed']

export function Incidents() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)

  const sources = React.useMemo(() => Array.from(new Set(WORLD.incidents.map((i) => i.source))).sort(), [])
  const open = WORLD.incidents.filter((i) => i.status !== 'Closed')

  const columns: Column<Incident>[] = [
    {
      key: 'id',
      header: 'Incident ID',
      sortValue: (i) => i.id,
      render: (i) => (
        <span className="inline-flex items-center gap-1.5">
          {i.status !== 'Closed' && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-critical" />}
          <span className="font-mono text-xs font-semibold text-info">{i.id}</span>
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (i) => i.title,
      className: 'max-w-[300px]',
      render: (i) => <span className="block truncate text-sm text-foreground">{i.title}</span>,
    },
    {
      key: 'classification',
      header: 'Classification',
      sortValue: (i) => SEV_ORDER[i.classification],
      render: (i) => <SeverityBadge severity={i.classification} dense />,
    },
    {
      key: 'source',
      header: 'Source',
      sortValue: (i) => i.source,
      render: (i) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
          <Radio className="size-3 text-muted-foreground" />
          {i.source}
        </span>
      ),
    },
    {
      key: 'detectedAt',
      header: 'Detected at (IST)',
      sortValue: (i) => new Date(i.detectedAt).getTime(),
      render: (i) => (
        <span className="text-xs text-foreground" title={fmtRelative(i.detectedAt)}>
          {fmtIST(i.detectedAt)}
        </span>
      ),
    },
    {
      key: 'flags',
      header: 'Impact',
      render: (i) => (
        <div className="flex items-center gap-1">
          {i.subscriberImpacting && (
            <span className="inline-flex items-center gap-1 rounded bg-high-soft px-1.5 py-0.5 text-2xs font-medium text-high" title="Subscriber-impacting">
              <Users className="size-3" /> Subscriber
            </span>
          )}
          {i.personalDataInvolved && (
            <span className="inline-flex items-center gap-1 rounded bg-medium-soft px-1.5 py-0.5 text-2xs font-medium text-medium" title="Personal data involved">
              <Database className="size-3" /> PII
            </span>
          )}
          {!i.subscriberImpacting && !i.personalDataInvolved && (
            <span className="text-2xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (i) => i.status,
      render: (i) => <StatusChip status={i.status} />,
    },
  ]

  const filters: TableFilter<Incident>[] = [
    { key: 'classification', label: 'Classification', options: ['Critical', 'High', 'Medium', 'Low'], predicate: (i, v) => i.classification === v },
    { key: 'source', label: 'Source', options: sources, predicate: (i, v) => i.source === v },
    { key: 'status', label: 'Status', options: STATUS_OPTIONS, predicate: (i, v) => i.status === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Incidents & Clocks"
        title="Incidents"
        description="Security and operational incidents on the PFRDA ICS Critical/High/Medium/Low taxonomy — fed from Sankalp ServiceDesk (ITSM), Splunk SIEM and CrowdStrike EDR. One incident record can drive multiple regulator clocks."
        actions={
          <div className="flex items-center gap-2">
            <ReportMenu templates={reportsForModule('Incident')} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToast({ title: 'Incidents exported', description: 'incident-log-jun-2026.csv.', variant: 'success' })}
            >
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Stat label="Open" value={open.length} tone="danger" />
        <Stat label="Critical (live)" value={WORLD.incidents.filter((i) => i.classification === 'Critical' && i.status !== 'Closed').length} tone="danger" />
        <Stat label="High (open)" value={open.filter((i) => i.classification === 'High').length} tone="warn" />
        <Stat label="Subscriber-impacting (open)" value={open.filter((i) => i.subscriberImpacting).length} tone="warn" />
        <Stat label="Total logged" value={WORLD.incidents.length} tone="neutral" />
      </div>

      <DataTable
        data={WORLD.incidents}
        columns={columns}
        searchKeys={['id', 'title', 'source']}
        searchPlaceholder="Search incident id, title or source…"
        filters={filters}
        initialSort={{ key: 'detectedAt', dir: 'desc' }}
        onRowClick={(i) => navigate(`/incidents/${i.id}`)}
        rightSlot={<span className="text-2xs text-muted-foreground">click a row → incident record</span>}
      />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'danger' | 'warn' | 'neutral' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs',
        tone === 'danger' ? 'border-critical/30 bg-critical-soft' : tone === 'warn' ? 'border-medium/40 bg-medium-soft' : 'border-border bg-background',
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold tnum', tone === 'danger' ? 'text-critical' : tone === 'warn' ? 'text-medium' : 'text-foreground')}>{value}</span>
    </span>
  )
}

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, CheckCircle2, UserCog, Wrench, ShieldAlert, ClipboardCheck, Siren } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { WORLD } from '@/data'
import { personName } from '@/data/people'
import { fmtDate, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import type { Issue, Severity } from '@/types'

const SEV_ORDER: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
const SOURCE_ICON = {
  'Control failure': ShieldAlert,
  'Audit finding': ClipboardCheck,
  Incident: Siren,
}

export function Issues() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)

  const owners = React.useMemo(() => Array.from(new Set(WORLD.issues.map((i) => personName(i.owner)))).sort(), [])
  const openCount = WORLD.issues.filter((i) => i.status !== 'Resolved').length
  const overdue = WORLD.issues.filter((i) => i.status === 'Overdue').length

  const columns: Column<Issue>[] = [
    {
      key: 'id',
      header: 'Issue ID',
      sortValue: (i) => i.id,
      render: (i) => <span className="font-mono text-xs font-semibold text-info">{i.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (i) => i.title,
      className: 'max-w-[320px]',
      render: (i) => <span className="block truncate text-sm text-foreground">{i.title}</span>,
    },
    {
      key: 'source',
      header: 'Source',
      sortValue: (i) => i.source,
      render: (i) => {
        const Icon = SOURCE_ICON[i.source]
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
            <Icon className="size-3.5 text-muted-foreground" />
            {i.source}
          </span>
        )
      },
    },
    {
      key: 'sourceRef',
      header: 'From',
      sortValue: (i) => i.sourceRef,
      render: (i) => <span className="font-mono text-2xs text-muted-foreground">{i.sourceRef}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      sortValue: (i) => SEV_ORDER[i.severity],
      render: (i) => <SeverityBadge severity={i.severity} dense />,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (i) => personName(i.owner),
      render: (i) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={i.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(i.owner)}</span>
        </span>
      ),
    },
    {
      key: 'ageDays',
      header: 'Age',
      align: 'right',
      sortValue: (i) => i.ageDays,
      render: (i) => <span className={cn('text-xs tnum', i.ageDays > 90 ? 'font-medium text-critical' : 'text-muted-foreground')}>{i.ageDays}d</span>,
    },
    {
      key: 'dueDate',
      header: 'Due',
      sortValue: (i) => new Date(i.dueDate).getTime(),
      render: (i) => {
        const overdueRow = new Date(i.dueDate).getTime() < NOW_MS && i.status !== 'Resolved'
        return <span className={cn('text-xs tnum', overdueRow ? 'font-medium text-critical' : 'text-muted-foreground')}>{fmtDate(i.dueDate)}</span>
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (i) => i.status,
      render: (i) => <StatusChip status={i.status} />,
    },
  ]

  const filters: TableFilter<Issue>[] = [
    { key: 'source', label: 'Source', options: ['Control failure', 'Audit finding', 'Incident'], predicate: (i, v) => i.source === v },
    { key: 'severity', label: 'Severity', options: ['Critical', 'High', 'Medium', 'Low'], predicate: (i, v) => i.severity === v },
    { key: 'status', label: 'Status', options: ['Open', 'In progress', 'Overdue', 'Resolved'], predicate: (i, v) => i.status === v },
    { key: 'owner', label: 'Owner', options: owners, predicate: (i, v) => personName(i.owner) === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Audit & Assurance"
        title="Issues & Remediation"
        description={`${WORLD.issues.length} remediation issues — every one traceable to its source: a failed control, an audit finding or an incident. Bulk-select to assign or close.`}
        actions={
          <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Issues exported', description: 'issues-remediation-jun-2026.csv.', variant: 'success' })}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md border border-border bg-background px-2.5 py-1">Open <span className="font-semibold tnum text-foreground">{openCount}</span></span>
        <span className="rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1 text-critical">Overdue <span className="font-semibold tnum">{overdue}</span></span>
        {(['Control failure', 'Audit finding', 'Incident'] as const).map((s) => (
          <span key={s} className="rounded-md border border-border bg-background px-2.5 py-1">
            {s} <span className="font-semibold tnum text-muted-foreground">{WORLD.issues.filter((i) => i.source === s).length}</span>
          </span>
        ))}
      </div>

      <DataTable
        data={WORLD.issues}
        columns={columns}
        searchKeys={['id', 'title', 'sourceRef', (i) => personName(i.owner)]}
        searchPlaceholder="Search issue id, title or source ref…"
        filters={filters}
        initialSort={{ key: 'severity', dir: 'desc' }}
        onRowClick={(i) => navigate(`/issues/${i.id}`)}
        selectable
        bulkBar={(sel, clear) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                pushToast({ title: `${sel.length} issues assigned`, description: 'Bulk reassignment applied.', variant: 'success' })
                clear()
              }}
            >
              <UserCog className="size-4" /> Assign owner
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                pushToast({ title: `${sel.length} issues set to In progress`, description: 'Bulk status update applied.', variant: 'info' })
                clear()
              }}
            >
              <Wrench className="size-4" /> Mark in progress
            </Button>
            <Button
              size="sm"
              onClick={() => {
                pushToast({ title: `${sel.length} issues closed`, description: 'Bulk closure recorded with evidence.', variant: 'success' })
                clear()
              }}
            >
              <CheckCircle2 className="size-4" /> Close selected
            </Button>
          </>
        )}
      />
    </div>
  )
}

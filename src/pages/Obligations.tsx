import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, CalendarDays, List, Network } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { MakerChecker } from '@/components/MakerChecker'
import { ObligationCalendar } from './obligations/ObligationCalendar'
import { cn } from '@/lib/utils'
import { WORLD } from '@/data'
import { personName } from '@/data/people'
import { fmtDate, fmtRelative, NOW_MS } from '@/lib/time'
import { REGULATOR_ORDER, REGULATOR_COLORS, RegulatorChip } from '@/lib/regulators'
import { useApp } from '@/store'
import type { Obligation } from '@/types'

export function Obligations() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const [tab, setTab] = React.useState<'list' | 'calendar'>('list')

  const owners = React.useMemo(() => Array.from(new Set(WORLD.obligations.map((o) => personName(o.owner)))).sort(), [])
  const frequencies = React.useMemo(() => Array.from(new Set(WORLD.obligations.map((o) => o.frequency))).sort(), [])

  const overdue = WORLD.obligations.filter((o) => o.status === 'Overdue').length
  const dueSoon = WORLD.obligations.filter((o) => o.status === 'Due').length

  const columns: Column<Obligation>[] = [
    {
      key: 'id',
      header: 'Obligation ID',
      sortValue: (o) => o.id,
      render: (o) => <span className="font-mono text-xs font-semibold text-info">{o.id}</span>,
    },
    {
      key: 'regulator',
      header: 'Regulator',
      sortValue: (o) => o.regulator,
      render: (o) => <RegulatorChip regulator={o.regulator} />,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (o) => o.title,
      className: 'max-w-[240px]',
      render: (o) => <span className="block truncate text-sm text-foreground">{o.title}</span>,
    },
    { key: 'frequency', header: 'Frequency', sortValue: (o) => o.frequency, render: (o) => <span className="text-xs text-muted-foreground">{o.frequency}</span> },
    {
      key: 'dueDate',
      header: 'Due date',
      sortValue: (o) => new Date(o.dueDate).getTime(),
      render: (o) => {
        const overdueRow = o.status === 'Overdue'
        const soon = o.status === 'Due' && new Date(o.dueDate).getTime() - NOW_MS < 30 * 86400000
        return (
          <span className={cn('text-xs tnum', overdueRow ? 'font-medium text-critical' : soon ? 'text-medium' : 'text-foreground')}>
            {fmtDate(o.dueDate)}
            <span className="ml-1 text-2xs opacity-70">· {fmtRelative(o.dueDate)}</span>
          </span>
        )
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (o) => personName(o.owner),
      render: (o) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={o.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(o.owner)}</span>
        </span>
      ),
    },
    {
      key: 'makerChecker',
      header: 'Maker-checker',
      render: (o) => <MakerChecker mc={o.makerChecker} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (o) => o.status,
      render: (o) => <StatusChip status={o.status} />,
    },
  ]

  const filters: TableFilter<Obligation>[] = [
    { key: 'regulator', label: 'Regulator', options: REGULATOR_ORDER, predicate: (o, v) => o.regulator === v },
    { key: 'status', label: 'Status', options: ['Filed', 'Due', 'Overdue', 'In review'], predicate: (o, v) => o.status === v },
    { key: 'frequency', label: 'Frequency', options: frequencies, predicate: (o, v) => o.frequency === v },
    { key: 'owner', label: 'Owner', options: owners, predicate: (o, v) => personName(o.owner) === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Obligations & Calendar"
        description={
          <>
            <span className="font-medium text-foreground">Every regulator on one calendar.</span> {WORLD.obligations.length}{' '}
            obligations across PFRDA, CERT-In, DPDP, GST, Labour and the Companies Act — one cadence, one maker-checker
            trail, one evidence vault.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border p-0.5">
              <ToggleBtn active={tab === 'list'} onClick={() => setTab('list')} icon={<List className="size-4" />} label="List" />
              <ToggleBtn active={tab === 'calendar'} onClick={() => setTab('calendar')} icon={<CalendarDays className="size-4" />} label="Calendar" />
            </div>
            <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Compliance calendar exported', description: 'obligations-calendar-jun-2026.ics.', variant: 'success' })}>
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      {/* per-regulator summary — "one calendar across regulators" */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          <Network className="size-3.5" /> One calendar
        </span>
        {REGULATOR_ORDER.map((r) => {
          const total = WORLD.obligations.filter((o) => o.regulator === r).length
          const od = WORLD.obligations.filter((o) => o.regulator === r && o.status === 'Overdue').length
          return (
            <span key={r} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
              <span className="size-2 rounded-full" style={{ background: REGULATOR_COLORS[r].dot }} />
              <span className="text-foreground">{r}</span>
              <span className="font-semibold tnum text-muted-foreground">{total}</span>
              {od > 0 && <span className="rounded bg-critical-soft px-1 text-2xs font-semibold text-critical">{od} overdue</span>}
            </span>
          )
        })}
        <span className="ml-auto inline-flex items-center gap-2 text-xs">
          <span className="rounded-md border border-critical/30 bg-critical-soft px-2 py-1 font-medium text-critical">{overdue} overdue</span>
          <span className="rounded-md border border-medium/40 bg-medium-soft px-2 py-1 font-medium text-medium">{dueSoon} due ≤30 days</span>
        </span>
      </div>

      {tab === 'list' ? (
        <DataTable
          data={WORLD.obligations}
          columns={columns}
          searchKeys={['id', 'title', 'reference', (o) => personName(o.owner)]}
          searchPlaceholder="Search obligation id, title or owner…"
          filters={filters}
          initialSort={{ key: 'dueDate', dir: 'asc' }}
          onRowClick={(o) => navigate(`/obligations/${o.id}`)}
        />
      ) : (
        <ObligationCalendar obligations={WORLD.obligations} />
      )}
    </div>
  )
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

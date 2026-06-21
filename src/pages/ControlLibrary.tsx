import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Bot, Hand, Layers } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { FrameworkPills } from '@/components/FrameworkPill'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { WORLD } from '@/data'
import { clausesForControl } from '@/lib/sources'
import { personName } from '@/data/people'
import { fmtDate, fmtRelative } from '@/lib/time'
import { useApp } from '@/store'
import type { Control } from '@/types'

const FRAMEWORK_OPTIONS = ['ISO 27001', 'NIST CSF', 'PCI DSS', 'PFRDA ICS']

export function ControlLibrary() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const sessionControls = useApp((s) => s.sessionControls)
  const clauseOverrides = useApp((s) => s.clauseOverrides)

  const allControls = React.useMemo(() => [...WORLD.controls, ...sessionControls], [sessionControls])

  // How many clauses / acts each control satisfies (Sources pipeline).
  const satisfies = React.useMemo(() => {
    const m = new Map<string, { clauses: number; acts: number }>()
    for (const c of allControls) {
      const cl = clausesForControl(c.id, clauseOverrides)
      if (cl.length) m.set(c.id, { clauses: cl.length, acts: new Set(cl.map((p) => p.instrumentId)).size })
    }
    return m
  }, [allControls, clauseOverrides])

  const owners = React.useMemo(
    () => Array.from(new Set(allControls.map((c) => personName(c.owner)))).sort(),
    [allControls],
  )
  const ccmCount = allControls.filter((c) => c.automation === 'CCM').length
  const multiMapped = allControls.filter((c) => c.frameworks.length >= 2).length
  const avgFrameworks = (WORLD.controls.reduce((s, c) => s + c.frameworks.length, 0) / WORLD.controls.length).toFixed(1)

  const columns: Column<Control>[] = [
    {
      key: 'id',
      header: 'Control ID',
      sortValue: (c) => c.id,
      render: (c) => <span className="font-mono text-xs font-semibold text-info">{c.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (c) => c.title,
      className: 'max-w-[260px]',
      render: (c) => <span className="block truncate text-sm text-foreground">{c.title}</span>,
    },
    {
      key: 'frameworks',
      header: 'Frameworks satisfied',
      sortValue: (c) => c.frameworks.length,
      render: (c) => (c.frameworks.length ? <FrameworkPills frameworks={c.frameworks} /> : <span className="text-2xs text-muted-foreground">—</span>),
    },
    {
      key: 'satisfies',
      header: 'Satisfies clauses',
      sortValue: (c) => satisfies.get(c.id)?.clauses ?? 0,
      render: (c) => {
        const s = satisfies.get(c.id)
        return s ? (
          <span className="inline-flex items-center gap-1 rounded bg-info-soft px-1.5 py-0.5 text-2xs font-medium text-info" title={`${s.clauses} clause(s) across ${s.acts} act(s)`}>
            {s.clauses} clause{s.clauses === 1 ? '' : 's'} · {s.acts} act{s.acts === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        )
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (c) => personName(c.owner),
      render: (c) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={c.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(c.owner)}</span>
        </span>
      ),
    },
    { key: 'type', header: 'Type', sortValue: (c) => c.type, render: (c) => <span className="text-xs text-foreground">{c.type}</span> },
    {
      key: 'automation',
      header: 'Automation',
      sortValue: (c) => c.automation,
      render: (c) =>
        c.automation === 'CCM' ? (
          <span className="inline-flex items-center gap-1 rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok">
            <Bot className="size-3" /> CCM
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
            <Hand className="size-3" /> Manual
          </span>
        ),
    },
    {
      key: 'lastTested',
      header: 'Last tested',
      sortValue: (c) => new Date(c.lastTested).getTime(),
      render: (c) => (
        <span className="text-xs text-muted-foreground" title={fmtDate(c.lastTested)}>
          {fmtRelative(c.lastTested)}
        </span>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      sortValue: (c) => c.result,
      render: (c) => <StatusChip status={c.result} />,
    },
    {
      key: 'evidenceCount',
      header: 'Evidence',
      align: 'right',
      sortValue: (c) => c.evidenceCount,
      render: (c) => <span className="text-xs tabular-nums text-foreground">{c.evidenceCount}</span>,
    },
  ]

  const filters: TableFilter<Control>[] = [
    { key: 'framework', label: 'Framework', options: FRAMEWORK_OPTIONS, predicate: (c, v) => c.frameworks.includes(v as Control['frameworks'][number]) },
    { key: 'automation', label: 'Automation', options: ['CCM', 'Manual'], predicate: (c, v) => c.automation === v },
    { key: 'result', label: 'Result', options: ['Pass', 'Partial', 'Fail'], predicate: (c, v) => c.result === v },
    { key: 'owner', label: 'Owner', options: owners, predicate: (c, v) => personName(c.owner) === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Risk & Control"
        title="Control Library"
        description={
          <>
            <span className="font-medium text-foreground">Map once, satisfy many.</span> {WORLD.controls.length} controls,
            each mapped to the ISO 27001, NIST CSF, PCI DSS and PFRDA ICS clauses it satisfies — so a control like MFA
            is tested once and counts everywhere.
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => pushToast({ title: 'Control library exported', description: 'control-library-jun-2026.csv.', variant: 'success' })}
          >
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Stat icon={<Layers className="size-3.5" />} label="Avg frameworks / control" value={avgFrameworks} />
        <Stat label="Mapped to ≥2 frameworks" value={`${multiMapped}`} />
        <Stat icon={<Bot className="size-3.5" />} label="CCM-automated" value={`${ccmCount}`} tone="ok" />
        <Stat label="Failing" value={`${WORLD.controls.filter((c) => c.result === 'Fail').length}`} tone="danger" />
      </div>

      <DataTable
        data={allControls}
        columns={columns}
        searchKeys={['id', 'title', (c) => personName(c.owner)]}
        searchPlaceholder="Search control id, title or owner…"
        filters={filters}
        initialSort={{ key: 'id', dir: 'asc' }}
        onRowClick={(c) => navigate(`/controls/${c.id}`)}
        rightSlot={<span className="text-2xs text-muted-foreground">one row → one control, many frameworks</span>}
      />
    </div>
  )
}

function Stat({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: string; tone?: 'ok' | 'danger' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold tnum', tone === 'ok' ? 'text-ok' : tone === 'danger' ? 'text-critical' : 'text-foreground')}>{value}</span>
    </span>
  )
}

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert, Gauge, Layers, CalendarX2, CalendarClock, Scale, BadgeCheck, Library,
  Activity, ClipboardCheck, Wrench, Users, Plug, ShieldCheck, ArrowUpRight, Inbox, FileSearch,
} from 'lucide-react'
import { RoleDashboard, DashboardCard, StatGroup, ReportMenu, reportsForPersona, type Stat } from '@/components/kit'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { RegulatorChip } from '@/lib/regulators'
import { HeatMap } from './HeatMap'
import { useApp } from '@/store'
import { WORLD, SOURCES, getInstrument } from '@/data'
import { PEOPLE_BY_ID, ROLES } from '@/data/people'
import { useEffectiveObligations, useEffectiveControls, useEffectiveIssues, useEffectiveAudits } from '@/lib/effective'
import { useEffectiveMetrics } from '@/lib/metrics'
import { effectiveClause, awaitingDecision } from '@/lib/sources'
import { pct } from '@/lib/format'
import { fmtRelative, fmtDate, NOW_MS } from '@/lib/time'
import type { QueueTask, RoleKey } from '@/types'

// ── shared bits ───────────────────────────────────────────────────────────────

function usePersona() {
  const role = useApp((s) => s.role)
  const selfId = useApp((s) => s.currentPersonId)()
  const label = ROLES.find((r) => r.key === role)?.label ?? 'OneGRC'
  const person = PEOPLE_BY_ID[selfId]
  const first = person?.name.split(' ')[0] ?? ''
  return { role, selfId, label, person, first }
}

function useMyTasks(role: RoleKey): QueueTask[] {
  return React.useMemo(
    () => WORLD.queue.filter((q) => q.role === role).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()),
    [role],
  )
}

function Row({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-info-soft/30"
    >
      {children}
      <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  )
}

function TaskList({ tasks, limit = 6 }: { tasks: QueueTask[]; limit?: number }) {
  const navigate = useNavigate()
  const rows = tasks.slice(0, limit)
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-6 text-sm text-muted-foreground">
        <Inbox className="size-4" /> Nothing in your queue right now.
      </div>
    )
  }
  return (
    <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
      {rows.map((t) => {
        const overdue = new Date(t.due).getTime() < NOW_MS
        return (
          <Row key={t.id} onClick={() => navigate(t.route)}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">{t.title}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
                <span className="font-mono font-semibold text-info">{t.ref}</span>
                <span>·</span>
                <span className={overdue ? 'font-medium text-critical' : ''}>{overdue ? 'Overdue' : 'Due'} {fmtRelative(t.due)}</span>
              </div>
            </div>
            <SeverityBadge severity={t.priority} dense />
          </Row>
        )
      })}
    </div>
  )
}

function MyWorkCard({ role }: { role: RoleKey }) {
  const tasks = useMyTasks(role)
  return (
    <DashboardCard title="My work" icon={<Inbox className="size-4 text-info" />} to="/queue" action={<span className="text-2xs text-muted-foreground tnum">{tasks.length} open</span>}>
      <TaskList tasks={tasks} />
    </DashboardCard>
  )
}

// ── Risk Manager ──────────────────────────────────────────────────────────────

export function RiskManagerDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const M = useEffectiveMetrics()
  const risks = WORLD.risks
  const topResidual = [...risks].sort((a, b) => b.residual - a.residual).slice(0, 6)
  const highCount = risks.filter((r) => r.residual >= 15).length
  const noControl = risks.filter((r) => !r.linkedControls?.length).length

  const stats: Stat[] = [
    { label: 'Enterprise risk', value: M.enterpriseRisk.toFixed(1), sub: '/10 board-weighted', tone: 'warn', icon: <Gauge className="size-3.5" />, onClick: () => navigate('/risks') },
    { label: 'High residual', value: highCount, sub: 'residual 15+', tone: 'danger', icon: <ShieldAlert className="size-3.5" />, onClick: () => navigate('/risks') },
    { label: 'Without a control', value: noControl, sub: 'coverage gap', tone: noControl ? 'warn' : 'ok', icon: <Layers className="size-3.5" />, onClick: () => navigate('/risks') },
    { label: 'Open incidents', value: M.openIncidents, sub: `${M.criticalOpen} critical`, tone: 'danger', icon: <ShieldAlert className="size-3.5" />, onClick: () => navigate('/incidents') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Risk Manager · ${label}`}
      title={`Risk posture, ${first}`}
      description="The enterprise risk register, heat map and treatment - ratings grounded in the consequence of the underlying obligations."
      actions={<ReportMenu templates={reportsForPersona('RISK')} />}
      summary={<StatGroup stats={stats} />}
    >
      <div className="lg:col-span-2"><HeatMap /></div>
      <DashboardCard title="Top residual risks" icon={<ShieldAlert className="size-4 text-critical" />} to="/risks">
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {topResidual.map((r) => (
            <Row key={r.id} onClick={() => navigate(`/risks/${r.id}`)}>
              <span className="font-mono text-2xs font-semibold text-info">{r.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{r.title}</span>
              <span className="rounded bg-muted px-1.5 py-0 text-2xs text-muted-foreground">{r.domain}</span>
              <span className="tnum text-2xs font-semibold text-critical">{r.residual}</span>
            </Row>
          ))}
        </div>
      </DashboardCard>
      <MyWorkCard role="RISK" />
    </RoleDashboard>
  )
}

// ── Compliance Manager ────────────────────────────────────────────────────────

function pendingClauseDecisions(overrides: ReturnType<typeof useApp.getState>['clauseOverrides']) {
  return SOURCES.filter((p) => p.status && p.applicable !== false && awaitingDecision(effectiveClause(p, overrides).status)).slice(0, 30)
}

export function ComplianceManagerDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const M = useEffectiveMetrics()
  const overrides = useApp((s) => s.clauseOverrides)
  const obligations = useEffectiveObligations()
  const tasks = useMyTasks('CCO')
  const approvals = tasks.filter((t) => t.kind === 'Approval')
  const pending = pendingClauseDecisions(overrides)
  const dueSoon = [...obligations]
    .filter((o) => o.status === 'Due' || o.status === 'Overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6)

  const stats: Stat[] = [
    { label: 'Overdue', value: M.overdueObligations, sub: 'obligations', tone: 'danger', icon: <CalendarX2 className="size-3.5" />, onClick: () => navigate('/obligations') },
    { label: 'Due soon', value: M.dueSoonObligations, sub: 'this cycle', tone: 'warn', icon: <CalendarClock className="size-3.5" />, onClick: () => navigate('/obligations') },
    { label: 'Clause decisions', value: pending.length, sub: 'awaiting you', tone: 'info', icon: <Scale className="size-3.5" />, onClick: () => navigate('/sources') },
    { label: 'Approvals', value: approvals.length, sub: 'in your queue', tone: 'warn', icon: <BadgeCheck className="size-3.5" />, onClick: () => navigate('/queue') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Compliance Manager · ${label}`}
      title={`Compliance coverage, ${first}`}
      description="The unified obligation register, the source-to-action pipeline and the approvals that route to you under maker-checker."
      actions={<ReportMenu templates={reportsForPersona('CCO')} />}
      summary={<StatGroup stats={stats} />}
    >
      <DashboardCard title="Clause decisions pending" icon={<Scale className="size-4 text-info" />} to="/sources" action={<span className="text-2xs text-muted-foreground tnum">{pending.length}</span>}>
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {pending.slice(0, 6).map((p) => {
            const inst = getInstrument(p.instrumentId)
            return (
              <Row key={p.id} onClick={() => navigate(`/sources/section/${p.id}`)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{p.nameOfCompliance ?? p.title}</span>
                  <span className="block truncate text-2xs text-muted-foreground">{inst?.authority} · {p.provision}</span>
                </span>
                {p.severity && <SeverityBadge severity={p.severity} dense />}
              </Row>
            )
          })}
        </div>
      </DashboardCard>
      <DashboardCard title="Filing calendar" icon={<CalendarClock className="size-4 text-medium" />} to="/obligations">
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {dueSoon.map((o) => {
            const overdue = o.status === 'Overdue'
            return (
              <Row key={o.id} onClick={() => navigate(`/obligations/${o.id}`)}>
                <RegulatorChip regulator={o.regulator} />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{o.title}</span>
                <span className={`tnum text-2xs ${overdue ? 'font-medium text-critical' : 'text-muted-foreground'}`}>{fmtDate(o.dueDate)}</span>
              </Row>
            )
          })}
        </div>
      </DashboardCard>
      <MyWorkCard role="CCO" />
      <DashboardCard title="Approvals waiting" icon={<BadgeCheck className="size-4 text-ok" />} to="/queue" action={<span className="text-2xs text-muted-foreground tnum">{approvals.length}</span>}>
        <TaskList tasks={approvals} />
      </DashboardCard>
    </RoleDashboard>
  )
}

// ── Compliance Analyst ────────────────────────────────────────────────────────

export function ComplianceAnalystDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const overrides = useApp((s) => s.clauseOverrides)
  const tasks = useMyTasks('ANALYST')
  const overdue = tasks.filter((t) => new Date(t.due).getTime() < NOW_MS)
  const evidence = tasks.filter((t) => t.kind === 'Evidence request')
  const pending = pendingClauseDecisions(overrides)

  const stats: Stat[] = [
    { label: 'My tasks', value: tasks.length, sub: 'assigned to me', tone: 'neutral', icon: <Inbox className="size-3.5" />, onClick: () => navigate('/queue') },
    { label: 'Overdue', value: overdue.length, sub: 'past due', tone: overdue.length ? 'danger' : 'ok', icon: <CalendarX2 className="size-3.5" />, onClick: () => navigate('/queue') },
    { label: 'Evidence to attach', value: evidence.length, sub: 'requests', tone: 'warn', icon: <FileSearch className="size-3.5" />, onClick: () => navigate('/evidence') },
    { label: 'Clauses to work', value: pending.length, sub: 'in the pipeline', tone: 'info', icon: <Scale className="size-3.5" />, onClick: () => navigate('/sources') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Compliance Analyst · ${label}`}
      title={`Your filings, ${first}`}
      description="The filings and evidence that are yours to complete this cycle, and the clause-pipeline work waiting on you."
      actions={<ReportMenu templates={reportsForPersona('ANALYST')} />}
      summary={<StatGroup stats={stats} />}
    >
      <DashboardCard title="My filings & tasks" icon={<Inbox className="size-4 text-info" />} to="/queue" action={<span className="text-2xs text-muted-foreground tnum">{tasks.length}</span>}>
        <TaskList tasks={tasks} limit={8} />
      </DashboardCard>
      <DashboardCard title="Clause-pipeline work" icon={<Scale className="size-4 text-info" />} to="/sources">
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {pending.slice(0, 6).map((p) => {
            const inst = getInstrument(p.instrumentId)
            return (
              <Row key={p.id} onClick={() => navigate(`/sources/section/${p.id}`)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{p.nameOfCompliance ?? p.title}</span>
                  <span className="block truncate text-2xs text-muted-foreground">{inst?.authority} · {p.provision}</span>
                </span>
                <StatusChip status={effectiveClause(p, overrides).status ?? 'Processing'} />
              </Row>
            )
          })}
        </div>
      </DashboardCard>
    </RoleDashboard>
  )
}

// ── Control Owner ─────────────────────────────────────────────────────────────

export function ControlOwnerDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const M = useEffectiveMetrics()
  const controls = useEffectiveControls()
  const failing = controls.filter((c) => c.result === 'Fail')
  const partial = controls.filter((c) => c.result === 'Partial')
  const attention = [...failing, ...partial].slice(0, 6)

  const stats: Stat[] = [
    { label: 'Control coverage', value: pct(M.controlCoverage), sub: 'pass or partial', tone: 'ok', icon: <ShieldCheck className="size-3.5" />, onClick: () => navigate('/controls') },
    { label: 'Failing', value: failing.length, sub: 'need remediation', tone: 'danger', icon: <ShieldAlert className="size-3.5" />, onClick: () => navigate('/controls') },
    { label: 'Partial', value: partial.length, sub: 'degraded', tone: 'warn', icon: <Layers className="size-3.5" />, onClick: () => navigate('/controls') },
    { label: 'CCM-automated', value: M.ccmAutomated, sub: 'self-testing', tone: 'info', icon: <Activity className="size-3.5" />, onClick: () => navigate('/ccm') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Control Owner · ${label}`}
      title={`Your controls, ${first}`}
      description="The controls you operate, their test status and the continuous-monitoring rules that escalate on their own."
      actions={<ReportMenu templates={reportsForPersona('CTRLOWNER')} />}
      summary={<StatGroup stats={stats} />}
    >
      <DashboardCard title="Controls needing attention" icon={<Library className="size-4 text-critical" />} to="/controls" action={<span className="text-2xs text-muted-foreground tnum">{failing.length + partial.length}</span>}>
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {attention.map((c) => (
            <Row key={c.id} onClick={() => navigate(`/controls/${c.id}`)}>
              <span className="font-mono text-2xs font-semibold text-info">{c.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.title}</span>
              {c.automation === 'CCM' && <span className="rounded bg-info-soft px-1.5 py-0 text-2xs font-medium text-info">CCM</span>}
              <StatusChip status={c.result} />
            </Row>
          ))}
        </div>
      </DashboardCard>
      <MyWorkCard role="CTRLOWNER" />
    </RoleDashboard>
  )
}

// ── Auditor ───────────────────────────────────────────────────────────────────

export function AuditorDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const M = useEffectiveMetrics()
  const issues = useEffectiveIssues()
  const audits = useEffectiveAudits()
  const openAudits = audits.filter((a) => a.status !== 'Closed')
  const findingIssues = issues.filter((i) => i.source === 'Audit finding' && i.status !== 'Resolved')
  const overdueIssues = issues.filter((i) => i.status === 'Overdue')

  const stats: Stat[] = [
    { label: 'Active audits', value: openAudits.length, sub: `of ${audits.length}`, tone: 'info', icon: <ClipboardCheck className="size-3.5" />, onClick: () => navigate('/audits') },
    { label: 'Open findings', value: M.openFindings, sub: 'to remediate', tone: 'warn', icon: <FileSearch className="size-3.5" />, onClick: () => navigate('/audits') },
    { label: 'Overdue issues', value: overdueIssues.length, sub: 'past due', tone: overdueIssues.length ? 'danger' : 'ok', icon: <Wrench className="size-3.5" />, onClick: () => navigate('/issues') },
    { label: 'Finding remediations', value: findingIssues.length, sub: 'in flight', tone: 'neutral', icon: <Wrench className="size-3.5" />, onClick: () => navigate('/issues') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Auditor · ${label}`}
      title={`Assurance, ${first}`}
      description="Risk-based audits, findings and the remediation they spawn - with the evidence trail pulled straight from the connected model."
      actions={<ReportMenu templates={reportsForPersona('AUDITOR')} />}
      summary={<StatGroup stats={stats} />}
    >
      <DashboardCard title="Active audits" icon={<ClipboardCheck className="size-4 text-info" />} to="/audits">
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {openAudits.slice(0, 6).map((a) => {
            const open = a.findings.filter((f) => f.status !== 'Closed').length
            return (
              <Row key={a.id} onClick={() => navigate(`/audits/${a.id}`)}>
                <span className="font-mono text-2xs font-semibold text-info">{a.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{a.title}</span>
                <StatusChip status={a.status} />
                <span className="tnum text-2xs text-muted-foreground">{open} open</span>
              </Row>
            )
          })}
        </div>
      </DashboardCard>
      <DashboardCard title="Findings to remediation" icon={<Wrench className="size-4 text-medium" />} to="/issues" action={<span className="text-2xs text-muted-foreground tnum">{findingIssues.length}</span>}>
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {findingIssues.slice(0, 6).map((i) => (
            <Row key={i.id} onClick={() => navigate(`/issues/${i.id}`)}>
              <span className="font-mono text-2xs font-semibold text-info">{i.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{i.title}</span>
              <SeverityBadge severity={i.severity} dense />
            </Row>
          ))}
        </div>
      </DashboardCard>
      <MyWorkCard role="AUDITOR" />
    </RoleDashboard>
  )
}

// ── Administrator ─────────────────────────────────────────────────────────────

export function AdministratorDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const sessionLog = useApp((s) => s.auditLog)

  const stats: Stat[] = [
    { label: 'Users', value: WORLD.people.length, sub: 'on the roster', tone: 'neutral', icon: <Users className="size-3.5" />, onClick: () => navigate('/settings') },
    { label: 'Personas', value: ROLES.length, sub: 'access roles', tone: 'info', icon: <ShieldCheck className="size-3.5" />, onClick: () => navigate('/settings') },
    { label: 'Integrations', value: 11, sub: 'spokes connected', tone: 'ok', icon: <Plug className="size-3.5" />, onClick: () => navigate('/integrations') },
    { label: 'Session events', value: sessionLog.length, sub: 'in the audit log', tone: 'neutral', icon: <ClipboardCheck className="size-3.5" />, onClick: () => navigate('/settings') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Administrator · ${label}`}
      title={`Platform administration, ${first}`}
      description="Organisation, users and roles, frameworks, integrations and the tamper-evident audit log - every change itself governed by maker-checker."
      summary={<StatGroup stats={stats} />}
    >
      <DashboardCard title="Recent system activity" icon={<ClipboardCheck className="size-4 text-info" />} to="/settings">
        {sessionLog.length === 0 ? (
          <div className="flex items-center gap-2 px-0.5 py-4 text-sm text-muted-foreground">
            <ClipboardCheck className="size-4" /> No session events yet. Workflow actions appear here and in the audit log.
          </div>
        ) : (
          <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
            {sessionLog.slice(0, 6).map((e) => (
              <Row key={e.id} onClick={() => navigate(e.route ?? '/settings')}>
                <Avatar id={e.actor} size={18} />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{e.action}</span>
                <span className="text-2xs text-muted-foreground">{fmtRelative(e.at)}</span>
              </Row>
            ))}
          </div>
        )}
      </DashboardCard>
      <DashboardCard title="Integration health" icon={<Plug className="size-4 text-ok" />} to="/integrations">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-ok" /> 11 spokes connected · last sync within the hour</div>
          <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-ok" /> Sankalp ServiceDesk kept as a spoke, not replaced</div>
          <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-medium" /> CERT-In feed connector pending confirmation</div>
        </div>
      </DashboardCard>
      <MyWorkCard role="ADMIN" />
    </RoleDashboard>
  )
}

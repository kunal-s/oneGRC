import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Users, Layers, Timer, GitMerge, Plug, Database, Bell, ScrollText,
  Pencil, UserPlus, CheckCircle2, ShieldCheck, ExternalLink, Server,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { FrameworkPill } from '@/components/FrameworkPill'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/Drawer'
import { cn } from '@/lib/utils'
import { PEOPLE, personName } from '@/data/people'
import { fmtRelative, fmtIST, minsFromNow } from '@/lib/time'
import { inCrore, inGroup } from '@/lib/format'
import { resolveEntity } from '@/lib/entity'
import { useApp } from '@/store'
import type { Person } from '@/types'
import {
  ORG, ROLE_DEFS, ROLE_LABEL, USER_META, FRAMEWORKS, TOTAL_CONTROLS, REG_CLOCKS, MC_ROWS,
  INTEGRATIONS, RETENTION_CARDS, DEFAULT_NOTIFS, buildAuditLog, type AuditLogRow,
} from './settings/settingsData'

const LOD_LABEL: Record<string, string> = { '1LoD': '1st line', '2LoD': '2nd line', '3LoD': '3rd line' }

const SECTIONS = [
  { key: 'org', label: 'Organisation', icon: Building2 },
  { key: 'users', label: 'Users & Roles', icon: Users },
  { key: 'frameworks', label: 'Frameworks & Libraries', icon: Layers },
  { key: 'regulators', label: 'Regulators & Clocks', icon: Timer },
  { key: 'workflow', label: 'Maker-Checker & Workflow', icon: GitMerge },
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'retention', label: 'Data Retention & Privacy', icon: Database },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'audit', label: 'Audit Log', icon: ScrollText },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

// ── small UI atoms ──────────────────────────────────────────────────────────
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', on ? 'bg-primary' : 'bg-border')}
    >
      <span className={cn('inline-block size-4 transform rounded-full bg-white shadow transition-transform', on ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  )
}

function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('card-surface p-4', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  )
}

// ── 1 · Organisation ────────────────────────────────────────────────────────
function OrganisationSection() {
  const pushToast = useApp((s) => s.pushToast)
  const [edit, setEdit] = React.useState(false)
  return (
    <>
      <Card
        title="Organisation profile"
        action={
          <Button variant="outline" size="sm" onClick={() => setEdit(true)}>
            <Pencil className="size-3.5" /> Edit
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Legal entity" value={ORG.name} />
          <Field label="Entity type" value={ORG.entityType} />
          <Field label="Parent" value={ORG.parent} />
          <Field label="PFRDA registration" value={<span className="font-mono">{ORG.pfrdaReg}</span>} />
          <Field label="CIN" value={<span className="font-mono">{ORG.cin}</span>} />
          <Field label="PAN" value={<span className="font-mono">{ORG.pan}</span>} />
          <Field label="GSTIN" value={<span className="font-mono">{ORG.gstin}</span>} />
          <Field label="Registered office" value={ORG.office} />
          <Field label="Financial-year close" value={ORG.fyClose} />
          <Field label="NPS schemes managed" value={ORG.schemes} />
          <Field label="Assets under management" value={inCrore(ORG.aumCrore)} />
          <Field label="Subscribers" value={inGroup(ORG.subscribers)} />
        </div>
      </Card>
      <Drawer
        open={edit}
        onClose={() => setEdit(false)}
        title="Edit organisation profile"
        subtitle={ORG.name}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEdit(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { pushToast({ title: 'Saved', description: 'Organisation profile updated.', variant: 'success' }); setEdit(false) }}>Save changes</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {[
            ['Legal entity', ORG.name],
            ['Registered office', ORG.office],
            ['PFRDA registration', ORG.pfrdaReg],
            ['Financial-year close', ORG.fyClose],
          ].map(([l, v]) => (
            <label key={l} className="block">
              <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{l}</span>
              <input defaultValue={v} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </label>
          ))}
          <p className="text-2xs text-muted-foreground">AUM and subscriber counts are synced from NPS Trust / CRA and are read-only here.</p>
        </div>
      </Drawer>
    </>
  )
}

// ── 2 · Users & Roles ───────────────────────────────────────────────────────
function UsersRolesSection() {
  const pushToast = useApp((s) => s.pushToast)
  const [invite, setInvite] = React.useState(false)

  const columns: Column<Person>[] = [
    {
      key: 'name', header: 'Name', sortValue: (p) => p.name,
      render: (p) => <span className="inline-flex items-center gap-2"><Avatar id={p.id} size={22} /><span className="text-sm text-foreground">{p.name}</span></span>,
    },
    { key: 'title', header: 'Title', sortValue: (p) => p.title, render: (p) => <span className="text-xs text-foreground">{p.title}</span> },
    {
      key: 'role', header: 'Access role', sortValue: (p) => ROLE_LABEL[p.role],
      render: (p) => <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-foreground">{ROLE_LABEL[p.role]}</span>,
    },
    { key: 'lod', header: 'Line of defence', sortValue: (p) => p.lod, render: (p) => <span className="text-xs text-muted-foreground">{LOD_LABEL[p.lod]}</span> },
    {
      key: 'status', header: 'Status', sortValue: (p) => USER_META[p.id].status,
      render: (p) => <StatusChip status={USER_META[p.id].status} tone={USER_META[p.id].status === 'Active' ? 'ok' : USER_META[p.id].status === 'Away' ? 'warn' : 'info'} />,
    },
    {
      key: 'last', header: 'Last active', sortValue: (p) => USER_META[p.id].lastMins,
      render: (p) => <span className="text-xs text-muted-foreground">{fmtRelative(minsFromNow(-USER_META[p.id].lastMins))}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Users <span className="font-normal text-muted-foreground">· {PEOPLE.length} on the platform</span></h3>
          <Button variant="outline" size="sm" onClick={() => setInvite(true)}><UserPlus className="size-3.5" /> Invite user</Button>
        </div>
        <DataTable
          data={PEOPLE}
          columns={columns}
          searchKeys={['name', 'title']}
          searchPlaceholder="Search users…"
          initialSort={{ key: 'name', dir: 'asc' }}
          pageSize={20}
        />
      </div>

      <Card title="Platform roles">
        <p className="mb-3 text-2xs text-muted-foreground">
          Access is role-based across the three lines of defence. The seven personas marked <span className="font-medium text-foreground">persona switcher</span> are
          selectable from the top bar and change the landing dashboard, My Queue, the visible navigation and which approvals appear.
        </p>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {ROLE_DEFS.map((r) => (
            <div key={r.key} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{r.label}</span>
                <span className="rounded bg-muted px-1.5 py-0 text-2xs text-muted-foreground">{r.lod}</span>
                {r.switcher && <span className="rounded bg-info-soft px-1.5 py-0 text-2xs font-medium text-info">persona switcher</span>}
                <span className="ml-auto text-2xs text-muted-foreground">{r.members} {r.members === 1 ? 'member' : 'members'}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.summary}</p>
              <button onClick={() => pushToast({ title: 'Sent for approval', description: `Role change for ${r.label} routed to maker-checker.`, variant: 'success' })} className="mt-1.5 text-2xs font-medium text-info hover:underline">
                Edit role
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Drawer
        open={invite}
        onClose={() => setInvite(false)}
        title="Invite user"
        subtitle="Sankalp Pension Funds"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setInvite(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { pushToast({ title: 'Invitation sent', description: 'User invited and routed for access approval.', variant: 'success' }); setInvite(false) }}>Send invite</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block"><span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Full name</span>
            <input placeholder="e.g. Ananya Nair" className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
          <label className="block"><span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Work email</span>
            <input placeholder="name@sankalppf.in" className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
          <label className="block"><span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Access role</span>
            <select className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring">
              {ROLE_DEFS.map((r) => <option key={r.key}>{r.label}</option>)}
            </select></label>
          <p className="text-2xs text-muted-foreground">New access is subject to maker-checker approval before it takes effect.</p>
        </div>
      </Drawer>
    </div>
  )
}

// ── 3 · Frameworks & Libraries ──────────────────────────────────────────────
function FrameworksSection() {
  const pushToast = useApp((s) => s.pushToast)
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(Object.fromEntries(FRAMEWORKS.map((f) => [f.framework, f.enabled])))
  return (
    <Card title="Frameworks & control libraries">
      <p className="mb-3 text-2xs text-muted-foreground">
        {TOTAL_CONTROLS} controls in the unified library, each mapped to the clauses it satisfies — tested once, counted across every enabled framework (“map once, satisfy many”).
      </p>
      <div className="space-y-2">
        {FRAMEWORKS.map((f) => (
          <div key={f.framework} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            {f.framework !== 'COBIT' ? <FrameworkPill framework={f.framework} /> : <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">COBIT</span>}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{f.name} <span className="font-normal text-muted-foreground">{f.version}</span></div>
              <div className="text-2xs text-muted-foreground">
                {f.crosswalk ? `${f.mapped} controls mapped via crosswalk` : `${f.mapped} controls mapped`} · library updated {f.lastUpdate}
              </div>
            </div>
            <Toggle on={enabled[f.framework]} onChange={(v) => { setEnabled((s) => ({ ...s, [f.framework]: v })); pushToast({ title: 'Saved', description: `${f.name} ${v ? 'enabled' : 'disabled'}.`, variant: 'success' }) }} label={f.name} />
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-2xs text-muted-foreground">
        Map-once coverage means one MFA control satisfies ISO A.8.5, NIST PR.AA-03, PCI 8.4.2 and PFRDA ICS-07 from a single test and evidence trail.
      </div>
    </Card>
  )
}

// ── 4 · Regulators & Clocks ─────────────────────────────────────────────────
function RegulatorsSection() {
  const navigate = useNavigate()
  return (
    <Card title="Regulator clock configuration" action={<Button variant="outline" size="sm" onClick={() => navigate('/clocks')}><ExternalLink className="size-3.5" /> View live clocks</Button>}>
      <p className="mb-3 text-2xs text-muted-foreground">Thresholds below drive the live countdowns on Regulator Clocks and the regulator tracks on each incident. Read-only configuration.</p>
      <div className="space-y-2">
        {REG_CLOCKS.map((r) => (
          <div key={r.regulator} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-info" />
              <span className="text-sm font-semibold text-foreground">{r.regulator}</span>
            </div>
            <ul className="mt-1.5 space-y-1">
              {r.thresholds.map((t) => (
                <li key={t} className="flex items-start gap-1.5 text-xs text-foreground"><CheckCircle2 className="mt-0.5 size-3 shrink-0 text-ok" />{t}</li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-border pt-2 sm:grid-cols-4">
              <Field label="Retention" value={r.retention} />
              {r.sync && <Field label="Time sync" value={r.sync} />}
              <Field label="Owner" value={r.owner} />
              <Field label="Escalation" value={r.escalation} />
            </div>
            {r.note && <div className="mt-2 rounded bg-medium-soft/50 px-2 py-1 text-2xs text-medium">{r.note}</div>}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── 5 · Maker-Checker & Workflow ────────────────────────────────────────────
function WorkflowSection() {
  const pushToast = useApp((s) => s.pushToast)
  const [rows, setRows] = React.useState(MC_ROWS)
  return (
    <Card title="Maker-checker & approval workflow">
      <p className="mb-3 text-2xs text-muted-foreground">Which object types require a second-person check before they take effect, the default approver, and the escalation SLA.</p>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Object type</th>
              <th className="px-3 py-2">Maker-checker</th>
              <th className="px-3 py-2">Default approver</th>
              <th className="px-3 py-2">Escalation SLA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.object} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-2 text-xs font-medium text-foreground">{r.object}</td>
                <td className="px-3 py-2">
                  <Toggle on={r.required} label={r.object} onChange={(v) => { setRows((s) => s.map((x, j) => j === i ? { ...x, required: v } : x)); pushToast({ title: 'Saved', description: `Maker-checker ${v ? 'required' : 'optional'} for ${r.object}.`, variant: 'success' }) }} />
                </td>
                <td className="px-3 py-2 text-xs text-foreground">{r.approver}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.sla}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── 6 · Integrations ────────────────────────────────────────────────────────
function IntegrationsSection() {
  const navigate = useNavigate()
  return (
    <Card title="Connected systems" action={<Button variant="outline" size="sm" onClick={() => navigate('/integrations')}><ExternalLink className="size-3.5" /> Open diagram</Button>}>
      <p className="mb-3 text-2xs text-muted-foreground">
        {INTEGRATIONS.length} spokes feed the vendor-neutral OneGRC backbone. The in-house ITSM (Sankalp ServiceDesk) is kept and integrated, not replaced.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {INTEGRATIONS.map((it) => (
          <div key={it.name} className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
            <Server className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{it.name}</span>
                <span className="inline-flex items-center gap-1 text-2xs text-ok"><span className="size-1.5 rounded-full bg-ok" />{it.status}</span>
              </div>
              <div className="truncate text-2xs text-muted-foreground">{it.detail} · last sync {fmtRelative(minsFromNow(-it.syncMins))}</div>
            </div>
            <button onClick={() => navigate('/integrations')} className="text-2xs font-medium text-info hover:underline">Manage</button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── 7 · Data Retention & Privacy ────────────────────────────────────────────
function RetentionSection() {
  return (
    <Card title="Data retention & privacy">
      <p className="mb-3 text-2xs text-muted-foreground">Statutory retention floors are enforced platform-wide and override data-principal erasure where a law requires retention.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RETENTION_CARDS.map((c) => (
          <div key={c.title} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-ok" />
              <span className="text-sm font-medium text-foreground">{c.title}</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-foreground">{c.rule}</div>
            <div className="text-2xs text-muted-foreground">{c.basis}</div>
            <p className="mt-1 text-2xs text-muted-foreground">{c.note}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── 8 · Notifications ───────────────────────────────────────────────────────
function NotificationsSection() {
  const pushToast = useApp((s) => s.pushToast)
  const role = useApp((s) => s.role)
  const [prefs, setPrefs] = React.useState(DEFAULT_NOTIFS)
  const set = (i: number, ch: 'inApp' | 'email', v: boolean) => {
    setPrefs((s) => s.map((p, j) => j === i ? { ...p, [ch]: v } : p))
    pushToast({ title: 'Saved', description: 'Notification preference updated.', variant: 'success' })
  }
  return (
    <Card title="Notification preferences">
      <p className="mb-3 text-2xs text-muted-foreground">Per-event delivery for your current role ({ROLE_LABEL[role]}). Changes apply to your account only.</p>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2 text-center">In-app</th>
              <th className="px-3 py-2 text-center">Email</th>
            </tr>
          </thead>
          <tbody>
            {prefs.map((p, i) => (
              <tr key={p.event} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-2 text-xs font-medium text-foreground">{p.event}</td>
                <td className="px-3 py-2"><div className="flex justify-center"><Toggle on={p.inApp} onChange={(v) => set(i, 'inApp', v)} label={`${p.event} in-app`} /></div></td>
                <td className="px-3 py-2"><div className="flex justify-center"><Toggle on={p.email} onChange={(v) => set(i, 'email', v)} label={`${p.event} email`} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── 9 · Audit Log ───────────────────────────────────────────────────────────
const AUDIT_LOG = buildAuditLog()
function AuditLogSection() {
  const navigate = useNavigate()
  const columns: Column<AuditLogRow>[] = [
    { key: 'at', header: 'When (IST)', sortValue: (r) => new Date(r.at).getTime(), render: (r) => <span className="text-xs text-muted-foreground" title={fmtRelative(r.at)}>{fmtIST(r.at)}</span> },
    { key: 'actor', header: 'Actor', sortValue: (r) => personName(r.actor), render: (r) => <span className="inline-flex items-center gap-1.5"><Avatar id={r.actor} size={20} /><span className="text-xs text-foreground">{personName(r.actor)}</span></span> },
    { key: 'action', header: 'Action', sortValue: (r) => r.action, render: (r) => <span className="text-xs text-foreground">{r.action}</span> },
    { key: 'object', header: 'Object', sortValue: (r) => r.object, render: (r) => <span className="font-mono text-2xs font-semibold text-info">{r.object}</span> },
    { key: 'detail', header: 'Detail', className: 'max-w-[320px]', render: (r) => <span className="block truncate text-xs text-muted-foreground">{r.detail}</span> },
  ]
  return (
    <Card title="System audit log" action={<span className="text-2xs text-muted-foreground">tamper-evident · every change is evidence</span>}>
      <DataTable
        data={AUDIT_LOG}
        columns={columns}
        searchKeys={['action', 'object', 'detail', (r) => personName(r.actor)]}
        searchPlaceholder="Search audit log…"
        initialSort={{ key: 'at', dir: 'desc' }}
        onRowClick={(r) => navigate(resolveEntity(r.object).route)}
        pageSize={22}
      />
    </Card>
  )
}

// ── shell ───────────────────────────────────────────────────────────────────
export function Settings() {
  const [active, setActive] = React.useState<SectionKey>('org')

  return (
    <div>
      <PageHeader
        eyebrow="OneGRC"
        title="Settings"
        description="Administer the OneGRC instance for Sankalp Pension Funds — organisation profile, access, frameworks, regulator clocks, workflow, integrations, retention and the system audit log."
      />
      <div className="grid grid-cols-[210px_minmax(0,1fr)] gap-5">
        <nav className="sticky top-0 h-fit space-y-0.5">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const isActive = s.key === active
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className={cn('size-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                {s.label}
              </button>
            )
          })}
          <div className="mt-3 rounded-md border border-border bg-muted/30 px-2.5 py-2 text-2xs text-muted-foreground">
            Changes route through maker-checker. Access role determines what you can edit.
          </div>
        </nav>

        <div className="min-w-0">
          {active === 'org' && <OrganisationSection />}
          {active === 'users' && <UsersRolesSection />}
          {active === 'frameworks' && <FrameworksSection />}
          {active === 'regulators' && <RegulatorsSection />}
          {active === 'workflow' && <WorkflowSection />}
          {active === 'integrations' && <IntegrationsSection />}
          {active === 'retention' && <RetentionSection />}
          {active === 'notifications' && <NotificationsSection />}
          {active === 'audit' && <AuditLogSection />}
        </div>
      </div>
    </div>
  )
}

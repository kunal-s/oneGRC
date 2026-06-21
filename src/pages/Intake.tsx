import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Inbox, Upload, Cloud, Sparkles, ArrowUpRight, CheckCircle2, Eye, UserSearch, PauseCircle,
  ScrollText, BadgeCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { KpiTile } from '@/components/KpiTile'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  intakeInstruments, effectiveTriage, triageTone, awaitingTriage, isResolvedTriage, provisionsForInstrument,
} from '@/lib/sources'
import { fmtIST, fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import type { SourceInstrument, TriageState } from '@/types'

const fmtPct = (n: number) => `${n.toFixed(1)}%`

export function Intake() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const role = useApp((s) => s.role)
  const overrides = useApp((s) => s.intakeOverrides)
  const triageIntake = useApp((s) => s.triageIntake)

  const canTriage = role === 'COMPLIANCE' || role === 'COSEC'

  const items = React.useMemo(
    () =>
      intakeInstruments()
        .map((inst) => ({ inst, state: effectiveTriage(inst, overrides)! }))
        .sort((a, b) => new Date(b.inst.intake!.receivedAt).getTime() - new Date(a.inst.intake!.receivedAt).getTime()),
    [overrides],
  )

  const awaiting = items.filter((i) => awaitingTriage(i.state)).length
  const specialist = items.filter((i) => i.state === 'Needs external specialist').length
  const parked = items.filter((i) => i.state === 'Parked').length
  const resolved = items.filter((i) => isResolvedTriage(i.state)).length

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Compliance Intake"
        description={
          <>
            <span className="font-medium text-foreground">The inflow front door.</span> Incoming circulars are parsed
            onto the same Source Library model and triaged here — opening one lands in the Source Library, where the
            review and approve actions live.
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Upload circular', description: 'Circular uploaded and parsed into an instrument and its sections (session). Real document storage is a backend item.', variant: 'success' })}>
            <Upload className="size-4" /> Upload circular
          </Button>
        }
      />

      {/* Auto-pull pending-backend affordance */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-info/30 bg-info-soft/40 px-3.5 py-2.5 text-xs text-foreground">
        <Cloud className="size-4 shrink-0 text-info" />
        <span className="min-w-0 flex-1">
          <span className="font-medium">Auto-pull is a pending backend integration.</span> The live connector to online
          regulatory sources, the external-specialist engagement and document versioning run on the backend — the items
          below show the inflow, parsing, triage and accept-to-register flow in-memory.
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Awaiting triage" value={awaiting} icon={<Inbox className="size-4" />} tone={awaiting > 0 ? 'warn' : 'neutral'} />
        <KpiTile label="Needs specialist" value={specialist} icon={<UserSearch className="size-4" />} tone={specialist > 0 ? 'danger' : 'neutral'} />
        <KpiTile label="Parked" value={parked} icon={<PauseCircle className="size-4" />} />
        <KpiTile label="Accepted to register" value={resolved} icon={<BadgeCheck className="size-4" />} tone="ok" />
      </div>

      <div className="space-y-3">
        {items.map(({ inst, state }) => (
          <IntakeCard
            key={inst.id}
            inst={inst}
            state={state}
            canTriage={canTriage}
            onOpen={() => navigate(`/sources/${inst.id}`)}
            onConfirmParse={() => {
              triageIntake(inst.id, 'Under triage')
              pushToast({ title: 'Parse confirmed', description: `${inst.id} moved to triage.`, variant: 'success' })
            }}
            onAccept={() => {
              triageIntake(inst.id, 'Accepted')
              pushToast({ title: 'Accepted into the register', description: 'Open in the Source Library to save sections to controls and track.', variant: 'success' })
            }}
            onInternal={() => {
              triageIntake(inst.id, 'Needs internal review')
              pushToast({ title: 'Sent for internal review', description: `${inst.id} routed to the relevant SME / Legal.`, variant: 'success' })
            }}
            onSpecialist={() => {
              triageIntake(inst.id, 'Needs external specialist')
              pushToast({ title: 'Specialist requested', description: 'External-specialist engagement is a pending backend integration.', variant: 'info' })
            }}
            onPark={() => {
              triageIntake(inst.id, 'Parked', 'Parked pending further clarification.')
              pushToast({ title: 'Parked', description: `${inst.id} held pending clarification.`, variant: 'info' })
            }}
          />
        ))}
      </div>
    </div>
  )
}

function IntakeCard({
  inst, state, canTriage, onOpen, onConfirmParse, onAccept, onInternal, onSpecialist, onPark,
}: {
  inst: SourceInstrument
  state: TriageState
  canTriage: boolean
  onOpen: () => void
  onConfirmParse: () => void
  onAccept: () => void
  onInternal: () => void
  onSpecialist: () => void
  onPark: () => void
}) {
  const intake = inst.intake!
  const sections = provisionsForInstrument(inst.id)
  const resolved = isResolvedTriage(state)

  return (
    <div className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xs font-semibold text-info">{inst.id}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">{inst.instrumentType}</span>
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-foreground">
              {intake.channel === 'Auto-pull' ? <Cloud className="size-3" /> : <Upload className="size-3" />} {intake.channel}
            </span>
            <span className="text-2xs text-muted-foreground">received {fmtIST(intake.receivedAt)}</span>
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">{inst.title}</div>
          <div className="text-2xs text-muted-foreground">{inst.authority}{inst.regulator ? ` · ${inst.regulator}` : ''}</div>
        </div>
        <StatusChip status={state} tone={triageTone(state)} />
      </div>

      {/* Parse provenance (the regulatory-change agent) + confirm step */}
      <div className="mt-3 rounded-md border border-info/20 bg-info-soft/30 p-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-info" />
          <span className="text-2xs font-semibold uppercase tracking-wide text-info">{intake.parse.agent} · parsed</span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-info" style={{ width: `${intake.parse.confidence}%` }} />
            </span>
            <span className="text-2xs font-semibold tnum text-info">{fmtPct(intake.parse.confidence)}</span>
          </span>
        </div>
        <p className="mt-1.5 text-xs text-foreground">{intake.parse.recommendation}</p>
        <p className="mt-1 text-2xs text-muted-foreground">Basis: {intake.parse.basis} · {fmtDate(intake.parse.at)}</p>
        {state === 'Parsed' && canTriage && (
          <Button size="sm" variant="outline" className="mt-2" onClick={onConfirmParse}>
            <CheckCircle2 className="size-3.5" /> Confirm parse
          </Button>
        )}
      </div>

      {/* Sections parsed onto the shared model */}
      <div className="mt-3">
        <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Parsed onto the Source Library · {sections.length} section{sections.length === 1 ? '' : 's'}
        </div>
        <div className="space-y-1">
          {sections.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpen()}
              className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left transition-colors hover:border-info/40 hover:bg-info-soft/40"
            >
              <ScrollText className="size-3.5 shrink-0 text-info" />
              <span className="font-mono text-2xs font-semibold text-info">{p.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{p.title}</span>
              {p.severity && <SeverityBadge severity={p.severity} dense />}
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          ))}
        </div>
      </div>

      {state === 'Parked' && intake.parkedReason && (
        <p className="mt-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-2xs text-muted-foreground">Parked: {intake.parkedReason}</p>
      )}

      {/* Triage actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button size="sm" variant="outline" onClick={onOpen}>
          <ArrowUpRight className="size-3.5" /> Open in Source Library
        </Button>
        {resolved ? (
          <span className="inline-flex items-center gap-1 text-2xs font-medium text-ok"><BadgeCheck className="size-3.5" /> In the live register</span>
        ) : canTriage ? (
          <>
            <Button size="sm" onClick={onAccept}><CheckCircle2 className="size-4" /> Accept into register</Button>
            <TriageBtn icon={<Eye className="size-3.5" />} label="Internal review" onClick={onInternal} />
            <TriageBtn icon={<UserSearch className="size-3.5" />} label="Engage specialist" onClick={onSpecialist} />
            <TriageBtn icon={<PauseCircle className="size-3.5" />} label="Park" onClick={onPark} />
          </>
        ) : (
          <span className="text-2xs text-muted-foreground">Triage is available to the Compliance Officer or Company Secretary.</span>
        )}
      </div>
    </div>
  )
}

function TriageBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground',
        'transition-colors hover:border-info/40 hover:bg-info-soft/40',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

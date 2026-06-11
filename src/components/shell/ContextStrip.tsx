import { useNavigate } from 'react-router-dom'
import { Siren, Timer, ShieldCheck, CalendarX2, FileSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { METRICS } from '@/data'
import { nearestTrack } from '@/lib/clocks'
import { pct } from '@/lib/format'
import { RegulatorClockInline } from '../RegulatorClock'

function Vital({
  icon,
  label,
  value,
  tone = 'neutral',
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  tone?: 'neutral' | 'danger' | 'warn' | 'ok'
  onClick?: () => void
}) {
  const toneCls =
    tone === 'danger' ? 'text-critical' : tone === 'warn' ? 'text-medium' : tone === 'ok' ? 'text-ok' : 'text-foreground'
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-2.5 py-1 transition-colors',
        onClick && 'hover:bg-background',
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold tnum', toneCls)}>{value}</span>
    </button>
  )
}

export function ContextStrip() {
  const navigate = useNavigate()
  const nearest = nearestTrack()
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-muted/50 px-3">
      <Vital
        icon={<Siren className="size-3.5" />}
        label="Open incidents"
        value={
          <span>
            {METRICS.openIncidents}
            <span className="ml-1 text-2xs font-medium text-critical">/ {METRICS.criticalOpen} Critical</span>
          </span>
        }
        tone="danger"
        onClick={() => navigate('/incidents')}
      />
      <span className="h-4 w-px bg-border" />
      <Vital
        icon={<Timer className="size-3.5" />}
        label={`Nearest clock · ${nearest?.track.regulator ?? '—'}`}
        value={nearest ? <RegulatorClockInline track={nearest.track} /> : '—'}
        tone="danger"
        onClick={() => nearest && navigate(`/incidents/${nearest.incidentId}`)}
      />
      <span className="h-4 w-px bg-border" />
      <Vital
        icon={<ShieldCheck className="size-3.5" />}
        label="Control coverage"
        value={pct(METRICS.controlCoverage)}
        tone="ok"
        onClick={() => navigate('/controls')}
      />
      <span className="h-4 w-px bg-border" />
      <Vital
        icon={<CalendarX2 className="size-3.5" />}
        label="Overdue obligations"
        value={METRICS.overdueObligations}
        tone="warn"
        onClick={() => navigate('/obligations')}
      />
      <span className="h-4 w-px bg-border" />
      <Vital
        icon={<FileSearch className="size-3.5" />}
        label="Open findings"
        value={METRICS.openFindings}
        tone="warn"
        onClick={() => navigate('/audits')}
      />
      <div className="ml-auto flex items-center gap-2 pr-1 text-2xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-ok" />
          11 spokes connected
        </span>
        <span className="hidden sm:inline">· AUM ₹3,24,718 cr · 41,86,902 subscribers</span>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { Gauge, ShieldCheck, Siren, Timer, CalendarX2, FileSearch, Download } from 'lucide-react'
import { KpiTile } from '@/components/KpiTile'
import { RegulatorClockInline } from '@/components/RegulatorClock'
import { Button } from '@/components/ui/Button'
import { HeatMap } from './home/HeatMap'
import { NeedsAttention } from './home/NeedsAttention'
import { ActivityStream } from './home/ActivityStream'
import { TrendCharts } from './home/TrendCharts'
import { METRICS } from '@/data'
import { nearestTrack } from '@/lib/clocks'
import { pct } from '@/lib/format'
import { fmtIST, NOW } from '@/lib/time'
import { controlPassRateTrend, openIncidentsTrend } from '@/lib/trends'
import { useApp } from '@/store'

export function Home() {
  const navigate = useNavigate()
  const openDrawer = useApp((s) => s.openDrawer)
  const nearest = nearestTrack()

  return (
    <div className="space-y-5">
      {/* Hero strip */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary to-[hsl(222_47%_18%)] px-6 py-5 text-primary-foreground">
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-primary-foreground/60">
              Board Cockpit · {fmtIST(NOW)}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Good morning, Meera — OneGRC</h1>
            <p className="mt-1.5 max-w-3xl text-sm text-primary-foreground/80">
              One platform instead of two. One taxonomy of risks, controls, issues, obligations and evidence —
              every regulator on one calendar, one evidence trail. IT risk and enterprise compliance, on one
              board view and one live clock.
            </p>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-2 lg:flex">
            <Button
              variant="outline"
              size="sm"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
              onClick={() =>
                openDrawer({ kind: 'export-pdf', title: 'Board risk & compliance pack', payload: { filename: 'GRC-One-Board-Pack-Jun-2026.pdf' } })
              }
            >
              <Download className="size-4" />
              Export board pack
            </Button>
            <div className="text-right text-2xs text-primary-foreground/70">
              AUM ₹3,24,718 cr · 41,86,902 subscribers
              <br />
              {METRICS.ccmAutomated} controls CCM-automated · 11 spokes connected
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-16 size-64 rounded-full bg-accent/10 blur-2xl" />
      </div>

      {/* 6 KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label="Enterprise risk"
          value={METRICS.enterpriseRisk.toFixed(1)}
          unit="/10"
          icon={<Gauge className="size-3.5" />}
          tone="warn"
          trend="up"
          trendLabel="+0.3 QoQ"
          sub="Residual, board-weighted"
          onClick={() => navigate('/risks')}
        />
        <KpiTile
          label="Control coverage"
          value={pct(METRICS.controlCoverage)}
          icon={<ShieldCheck className="size-3.5" />}
          tone="ok"
          spark={controlPassRateTrend.map((p) => p.value)}
          sparkColor="hsl(var(--ok))"
          sub={`${METRICS.ccmAutomated} CCM-automated`}
          onClick={() => navigate('/controls')}
        />
        <KpiTile
          label="Open incidents"
          value={METRICS.openIncidents}
          icon={<Siren className="size-3.5" />}
          tone="danger"
          spark={openIncidentsTrend.map((p) => p.value)}
          sparkColor="hsl(var(--critical))"
          sub={`${METRICS.criticalOpen} Critical · 4 High`}
          onClick={() => navigate('/incidents')}
        />
        <KpiTile
          label={`Nearest clock · ${nearest?.track.regulator ?? '—'}`}
          value={nearest ? <RegulatorClockInline track={nearest.track} /> : '—'}
          icon={<Timer className="size-3.5" />}
          tone="danger"
          live
          sub="6-hour incident report"
          onClick={() => nearest && navigate(`/incidents/${nearest.incidentId}`)}
        />
        <KpiTile
          label="Overdue obligations"
          value={METRICS.overdueObligations}
          icon={<CalendarX2 className="size-3.5" />}
          tone="warn"
          sub={`${METRICS.dueSoonObligations} due ≤30 days`}
          onClick={() => navigate('/obligations')}
        />
        <KpiTile
          label="Open findings"
          value={METRICS.openFindings}
          icon={<FileSearch className="size-3.5" />}
          tone="warn"
          sub="Across 18 audits"
          onClick={() => navigate('/audits')}
        />
      </div>

      {/* Heat map + needs attention */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <HeatMap />
        <NeedsAttention />
      </div>

      {/* Trends */}
      <TrendCharts />

      {/* Activity stream */}
      <ActivityStream />

      <div className="pb-2 text-center text-2xs text-muted-foreground">
        OneGRC — Sankalp's unified GRC/IRM backbone (vendor-neutral) · Sankalp ServiceDesk integrated as a
        spoke
        <button
          className="ml-2 text-info hover:underline"
          onClick={() => navigate('/integrations')}
        >
          view integrations
        </button>
      </div>
    </div>
  )
}

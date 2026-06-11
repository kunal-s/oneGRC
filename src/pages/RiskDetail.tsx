import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Minus, ShieldCheck, Download, History } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { ScoreBadge, scoreBand } from '@/components/RiskScore'
import { CrossRefPanel } from '@/components/CrossRefPanel'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { RiskPositionMap } from './risks/RiskPositionMap'
import { getRisk, getControl } from '@/data'
import { personName, PEOPLE_BY_ID } from '@/data/people'
import { DOMAIN_COLORS } from '@/lib/heatmap'
import { fmtIST, fmtDate, fmtRelative } from '@/lib/time'
import { useApp } from '@/store'
import { ComingSoon } from './ComingSoon'

const TREATMENT_NARRATIVE: Record<string, string> = {
  Mitigate: 'Reduce likelihood and impact through layered controls; re-test on cadence and track residual to target.',
  Accept: 'Residual is within appetite; formally accepted with periodic review and a documented rationale.',
  Transfer: 'Risk shared via insurance / contractual transfer to a third party; coverage validated annually.',
  Avoid: 'Eliminate the exposure by discontinuing or re-architecting the underlying activity.',
}

export function RiskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const risk = id ? getRisk(id) : undefined

  if (!risk) return <ComingSoon title="Risk not found" />

  const TrendIcon = risk.trend === 'up' ? ArrowUpRight : risk.trend === 'down' ? ArrowDownRight : Minus
  const mitigation = risk.inherent - risk.residual
  const owner = PEOPLE_BY_ID[risk.owner]
  const passingControls = risk.linkedControls.filter((c) => getControl(c)?.result === 'Pass').length

  return (
    <div>
      <button
        onClick={() => navigate('/risks')}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Risk Register
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{risk.id}</span>
            <span className="size-2 rounded-full" style={{ background: DOMAIN_COLORS[risk.domain] }} />
            {risk.domain === 'ThirdParty' ? 'Third-party' : risk.domain} risk
          </span>
        }
        title={risk.title}
        description={risk.description}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={risk.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToast({ title: 'Risk summary exported', description: `${risk.id} one-pager.`, variant: 'success' })}
            >
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* scoring + position */}
          <div className="card-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Inherent vs residual position</h2>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  risk.trend === 'up' ? 'text-critical' : risk.trend === 'down' ? 'text-ok' : 'text-muted-foreground'
                }`}
              >
                <TrendIcon className="size-3.5" />
                {risk.trend === 'up' ? 'Rising' : risk.trend === 'down' ? 'Improving' : 'Stable'} this quarter
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <RiskPositionMap risk={risk} />
              <div className="space-y-2">
                <ScoreRow label="Likelihood" value={`${risk.likelihood} / 5`} />
                <ScoreRow label="Impact" value={`${risk.impact} / 5`} />
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground">Inherent</span>
                  <span className="inline-flex items-center gap-2">
                    <ScoreBadge score={risk.inherent} hollow />
                    <span className="text-2xs text-muted-foreground">{scoreBand(risk.inherent)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Residual</span>
                  <span className="inline-flex items-center gap-2">
                    <ScoreBadge score={risk.residual} />
                    <span className="text-2xs text-muted-foreground">{scoreBand(risk.residual)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-ok-soft px-2 py-1.5">
                  <span className="text-xs font-medium text-ok">Mitigation effect</span>
                  <span className="text-sm font-semibold tnum text-ok">−{mitigation}</span>
                </div>
              </div>
            </div>
          </div>

          {/* treatment plan */}
          <div className="card-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Treatment plan</h2>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusChip status={risk.treatment} tone={risk.treatment === 'Accept' ? 'neutral' : 'info'} />
              <span className="text-xs text-muted-foreground">Target residual ≤ {Math.max(1, risk.residual - 2)} / 25</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">{TREATMENT_NARRATIVE[risk.treatment]}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Owner">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar id={risk.owner} size={20} />
                  <span className="truncate text-xs text-foreground">{owner.name}</span>
                </span>
              </Metric>
              <Metric label="Line of defence">{owner.lod}</Metric>
              <Metric label="Linked controls">
                <span className="inline-flex items-center gap-1 text-xs">
                  <ShieldCheck className="size-3.5 text-ok" />
                  {passingControls}/{risk.linkedControls.length} passing
                </span>
              </Metric>
              <Metric label="Last reviewed">{fmtDate(risk.lastReviewed)}</Metric>
            </div>
          </div>

          {/* history */}
          <div className="card-surface p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <History className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">History</h2>
            </div>
            <ol className="space-y-2 text-xs">
              <HistoryRow at={risk.lastReviewed} text={`RCSA review completed — residual confirmed at ${risk.residual}/25, treatment "${risk.treatment}".`} who={risk.owner} />
              <HistoryRow at={daysBefore(risk.lastReviewed, 92)} text="Quarterly risk committee review — control effectiveness reassessed." who="meera" />
              <HistoryRow at={daysBefore(risk.lastReviewed, 184)} text={`Risk registered in the enterprise taxonomy with inherent ${risk.inherent}/25.`} who={risk.owner} />
            </ol>
          </div>
        </div>

        {/* shared-object cross references */}
        <div className="space-y-4">
          <CrossRefPanel
            groups={[
              { label: 'Controls mitigating this risk', ids: risk.linkedControls },
              { label: 'Incidents that realised this risk', ids: risk.linkedIncidents },
              { label: 'Open issues & remediation', ids: risk.linkedIssues },
            ]}
          />
          <div className="card-surface p-3.5 text-2xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Shared object.</span> This risk is the same record the
            CISO sees in IT-GRC and the board sees in the enterprise view — its controls, incidents and issues all
            reconcile here. One taxonomy, one evidence trail.
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tnum text-foreground">{value}</span>
    </div>
  )
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

function HistoryRow({ at, text, who }: { at: string; text: string; who: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-border" />
      <div>
        <p className="text-foreground">{text}</p>
        <div className="mt-0.5 text-2xs text-muted-foreground" title={fmtIST(at)}>
          {personName(who)} · {fmtDate(at)} · {fmtRelative(at)}
        </div>
      </div>
    </li>
  )
}

function daysBefore(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() - days * 86400000).toISOString()
}

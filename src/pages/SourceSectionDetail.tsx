import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, Scale, ScrollText, ExternalLink, Sparkles, CheckCircle2, UserSearch,
  ShieldCheck, Gavel, CalendarClock, Link2, ListChecks, Building2, ClipboardCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/Avatar'
import { SaveClauseChooser } from '@/components/SaveClauseChooser'
import { getInstrument, getControl, getSource } from '@/data'
import { effectiveClause, statusTone } from '@/lib/sources'
import { personName } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { ComingSoon } from './ComingSoon'

const fmtPct = (n: number) => `${n.toFixed(1)}%`

export function SourceSectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const base = id ? getSource(id) : undefined
  const overrides = useApp((s) => s.clauseOverrides)
  const getSessionControl = useApp((s) => s.getSessionControl)
  const engageSpecialist = useApp((s) => s.engageSpecialist)
  const completeSpecialist = useApp((s) => s.completeSpecialist)
  const pushToast = useApp((s) => s.pushToast)
  const setCopilotOpen = useApp((s) => s.setCopilotOpen)
  const openAgents = useApp((s) => s.openAgents)
  const [saving, setSaving] = React.useState(false)

  if (!base) return <ComingSoon title="Clause not found" />

  const p = effectiveClause(base, overrides)
  const inst = getInstrument(p.instrumentId)
  const canAct = useCanAct({ kind: 'clause.save' })
  const reviewable = Boolean(p.status)
  const saved = p.status === 'Saved'
  const inSpecialist = p.status === 'Specialist review'
  const linkedControl = p.linkedControlId ? getControl(p.linkedControlId) ?? getSessionControl(p.linkedControlId) : undefined

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <button onClick={() => navigate('/sources')} className="hover:text-foreground">Source Library</button>
        <span>/</span>
        {inst && <button onClick={() => navigate(`/sources/${inst.id}`)} className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-3" /> {inst.title}</button>}
      </div>

      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><span className="font-mono text-info">{p.id}</span><span className="text-muted-foreground">· {p.provision}</span></span>}
        title={p.title}
        description={p.briefDescription ?? p.citation}
        actions={
          <div className="flex items-center gap-2">
            {p.severity && <SeverityBadge severity={p.severity} />}
            {p.status && <StatusChip status={p.status} tone={statusTone(p.status)} />}
            <Button variant="outline" size="sm" onClick={() => setCopilotOpen(true)} title="Ask the OneGRC Copilot to clarify this clause">
              <Sparkles className="size-4 text-info" /> Ask Copilot
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Core */}
        <div className="space-y-4">
          <div className="card-surface p-4">
            {p.nameOfCompliance && (
              <div className="mb-3">
                <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">What this requires</div>
                <div className="mt-0.5 text-sm font-medium text-foreground">{p.nameOfCompliance}</div>
                {p.whatItMeans && <p className="mt-1 text-xs text-muted-foreground">{p.whatItMeans}</p>}
              </div>
            )}
            {p.keyParts && p.keyParts.length > 0 && (
              <ul className="mb-3 space-y-1">
                {p.keyParts.map((k, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground"><ListChecks className="mt-0.5 size-3.5 shrink-0 text-info" /> {k}</li>
                ))}
              </ul>
            )}
            <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Clause extract</div>
            <blockquote className="mt-1 border-l-2 border-info/40 bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-foreground">“{p.sourceExtract}”</blockquote>
            <div className="mt-1.5 text-2xs text-muted-foreground">{p.citation}</div>
          </div>

          {p.penaltyTiers && p.penaltyTiers.length > 0 && (
            <div className="card-surface p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Gavel className="size-4 text-medium" /> What happens if missed
                {p.severity && <span className="ml-auto inline-flex items-center gap-1.5 text-2xs text-muted-foreground">severity <SeverityBadge severity={p.severity} dense /></span>}
              </h3>
              <div className="space-y-1.5">
                {p.penaltyTiers.map((tier, i) => {
                  const src = getSource(tier.sourceRef)
                  return (
                    <div key={i} className="rounded-md border border-border bg-background p-2.5">
                      <div className="flex items-center gap-2"><SeverityBadge severity={tier.severity} dense /><span className="text-xs font-medium text-foreground">{tier.trigger}</span></div>
                      <div className="mt-1 text-xs text-muted-foreground">{tier.consequence}</div>
                      {src && (
                        <button onClick={() => navigate(`/sources/section/${tier.sourceRef}`)} className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-info hover:underline">
                          <ScrollText className="size-3" /> sourced to {src.title}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-2xs text-muted-foreground">Severity is derived from the gravity of these penalty tiers.</p>
            </div>
          )}

          {/* Recommendation + decision */}
          {reviewable && (
            <div className="card-surface p-4">
              {p.aiRecommendation && (
                <div className="rounded-md border border-info/20 bg-info-soft/30 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-info" />
                    <span className="text-2xs font-semibold uppercase tracking-wide text-info">{p.aiRecommendation.agent} · recommends</span>
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-info" style={{ width: `${p.aiRecommendation.confidence}%` }} /></span>
                      <span className="text-2xs font-semibold tnum text-info">{fmtPct(p.aiRecommendation.confidence)}</span>
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-foreground">{p.aiRecommendation.recommendation}</p>
                  <p className="mt-1 text-2xs text-muted-foreground">Basis: {p.aiRecommendation.basis} · {fmtDate(p.aiRecommendation.at)}</p>
                </div>
              )}

              {p.reviewer && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-2xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-ok" />
                  <span className="inline-flex items-center gap-1"><Avatar id={p.reviewer} size={16} /> <span className="font-medium text-foreground">{personName(p.reviewer)}</span></span>
                  <span>· {p.status?.toLowerCase()}</span>
                  {p.reviewedAt && <span>· {fmtDate(p.reviewedAt)}</span>}
                  {p.rationale && <span className="w-full text-foreground">“{p.rationale}”</span>}
                </div>
              )}

              {/* Specialist workflow */}
              {inSpecialist && (
                <div className="mt-3 rounded-md border border-medium/40 bg-medium-soft/30 p-2.5">
                  <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-medium"><UserSearch className="size-3.5" /> Specialist review</div>
                  {p.specialistNote ? (
                    <p className="mt-1 text-xs text-foreground">Outcome: {p.specialistNote}</p>
                  ) : (
                    <p className="mt-1 text-2xs text-muted-foreground">Engaged with outside counsel for an interpretation. Record the outcome to enable Save.</p>
                  )}
                  {canAct && !p.specialistNote && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => { completeSpecialist(p.id, 'Specialist confirmed applicability and the controls to implement; documented and ready to save.'); pushToast({ title: 'Specialist review complete', description: `${p.id} outcome documented — ready to save.`, variant: 'success' }) }}>
                      <ClipboardCheck className="size-3.5" /> Mark review complete
                    </Button>
                  )}
                </div>
              )}

              {saved ? (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-ok/30 bg-ok-soft/40 px-3 py-2 text-xs text-foreground">
                  <CheckCircle2 className="size-4 text-ok" /> Saved to a control and tracked.
                </div>
              ) : canAct ? (
                <div className="mt-3">
                  <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Decision</div>
                  <div className="flex flex-wrap gap-2">
                    {p.applicable !== false && (
                      <Button size="sm" onClick={() => setSaving(true)}><CheckCircle2 className="size-4" /> Save to a control</Button>
                    )}
                    {!inSpecialist && (
                      <button onClick={() => { engageSpecialist(p.id); pushToast({ title: 'Specialist engaged', description: `${p.id} routed to outside counsel for review.`, variant: 'info' }) }} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-info/40 hover:bg-info-soft/40">
                        <UserSearch className="size-3.5" /> Engage specialist
                      </button>
                    )}
                    {p.applicable !== false && (
                      <button onClick={() => openAgents(p.id)} className="inline-flex items-center gap-1.5 rounded-md border border-info/40 bg-info-soft/40 px-2.5 py-1.5 text-xs font-medium text-info transition-colors hover:bg-info-soft">
                        <Sparkles className="size-3.5" /> Propose mapping
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-2xs text-muted-foreground">Save maps this clause to a control (existing or new) and tracks it in the Control Library.</p>
                </div>
              ) : (
                <p className="mt-3 text-2xs text-muted-foreground">Save and specialist actions are available to the Compliance Officer or Company Secretary.</p>
              )}
            </div>
          )}
        </div>

        {/* Supporting */}
        <div className="space-y-4">
          <div className="card-surface p-3.5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Scale className="size-4 text-info" /> Source</h3>
            {inst && (
              <button onClick={() => navigate(`/sources/${inst.id}`)} className="group flex w-full items-start gap-2 rounded-md border border-border bg-background p-2 text-left hover:border-info/40 hover:bg-info-soft/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{inst.title}</span>
                  <span className="block text-2xs text-muted-foreground">{inst.instrumentType} · {inst.version ?? fmtDate(inst.dateOfIssue)} · {inst.status}</span>
                </span>
                <ArrowUpRight className="mt-0.5 size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            )}
            <a href={p.sourceLink ?? inst?.sourceLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-2xs font-medium text-info hover:underline"><ExternalLink className="size-3.5" /> Open full source</a>
          </div>

          {/* Applicability */}
          {p.applicable !== undefined && (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Building2 className="size-4 text-info" /> Applies to SPF</h3>
              {p.applicable ? <StatusChip status="Applicable" tone="ok" /> : <StatusChip status="Not applicable" tone="neutral" />}
              {p.applicabilityBasis && <p className="mt-1.5 text-2xs text-muted-foreground">{p.applicabilityBasis}</p>}
            </div>
          )}

          {(p.frequency || p.nextDue) && (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><CalendarClock className="size-4 text-info" /> How often / by when</h3>
              <div className="grid grid-cols-2 gap-3">
                <Meta label="Frequency">{p.frequency ?? '—'}</Meta>
                <Meta label="Next due">{p.nextDue ? fmtDate(p.nextDue) : '—'}</Meta>
              </div>
            </div>
          )}

          {/* Mapped control */}
          {reviewable && (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Link2 className="size-4 text-info" /> Mapped control</h3>
              {linkedControl ? (
                <button onClick={() => navigate(`/controls/${linkedControl.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-ok/30 bg-ok-soft/30 px-2 py-1.5 text-left hover:bg-ok-soft/60">
                  <ShieldCheck className="size-3.5 shrink-0 text-ok" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">{linkedControl.title}</span>
                    <span className="block text-2xs text-muted-foreground">{linkedControl.id} · {personName(linkedControl.owner)} · {linkedControl.frequency}{linkedControl.nextDue ? ` · due ${fmtDate(linkedControl.nextDue)}` : ''}</span>
                  </span>
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              ) : (
                <p className="text-2xs text-muted-foreground">Not yet saved — Save this clause to map it to a control and track it.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {saving && <SaveClauseChooser clause={p} onClose={() => setSaving(false)} />}
    </div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

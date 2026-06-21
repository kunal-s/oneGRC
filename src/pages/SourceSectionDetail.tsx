import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, Scale, ScrollText, Paperclip, Upload, ExternalLink,
  Sparkles, CheckCircle2, UserSearch, Eye, ShieldCheck, Gavel, CalendarClock, Link2, ListChecks,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { getInstrument, getObligation, getSource } from '@/data'
import { effectiveProvision, reviewTone } from '@/lib/sources'
import { personName } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { ComingSoon } from './ComingSoon'

const fmtPct = (n: number) => `${n.toFixed(1)}%`

export function SourceSectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const base = id ? getSource(id) : undefined
  const pushToast = useApp((s) => s.pushToast)
  const role = useApp((s) => s.role)
  const overrides = useApp((s) => s.reviewOverrides)
  const reviewProvision = useApp((s) => s.reviewProvision)
  const approveProvision = useApp((s) => s.approveProvision)

  if (!base) return <ComingSoon title="Section not found" />

  const p = effectiveProvision(base, overrides)
  const inst = getInstrument(p.instrumentId)
  // Only Compliance / Company Secretary may decide; the AI is the maker, the
  // Compliance reviewer the checker (maker-checker over the recommendation).
  const canReview = role === 'COMPLIANCE' || role === 'COSEC'
  const reviewable = Boolean(p.reviewState)
  const approved = p.reviewState === 'Approved and saved'

  const linkedObligation = p.linkedObligationId ? getObligation(p.linkedObligationId) : undefined
  const recommended = p.recommendedObligationIds.map((oid) => getObligation(oid)).filter(Boolean).slice(0, 6)

  const onApprove = () => {
    const { obligationId, controlId } = approveProvision(p.id)
    pushToast({
      title: 'Saved to controls — approved & tracking',
      description: `Control Library entry ${controlId}${obligationId ? ` and tracked obligation ${obligationId}` : ''} created.`,
      variant: 'success',
    })
  }
  const onRoute = (state: 'Needs internal review' | 'Needs specialist', rationale: string, title: string) => {
    reviewProvision(p.id, state, rationale)
    pushToast({ title, description: `${p.id} — ${rationale}`, variant: 'success' })
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <button onClick={() => navigate('/sources')} className="hover:text-foreground">Source Library</button>
        <span>/</span>
        {inst && <button onClick={() => navigate(`/sources/${inst.id}`)} className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-3" /> {inst.title}</button>}
      </div>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{p.id}</span>
            <span className="text-muted-foreground">· {p.provision}</span>
          </span>
        }
        title={p.title}
        description={p.briefDescription ?? p.citation}
        actions={
          <div className="flex items-center gap-2">
            {p.severity && <SeverityBadge severity={p.severity} />}
            {p.reviewState && <StatusChip status={p.reviewState} tone={reviewTone(p.reviewState)} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Core-first column */}
        <div className="space-y-4">
          {/* What this is + what it requires */}
          <div className="card-surface p-4">
            {p.nameOfCompliance && (
              <div className="mb-3">
                <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">What this requires</div>
                <div className="mt-0.5 text-sm font-medium text-foreground">{p.nameOfCompliance}</div>
                {p.briefDescription && <p className="mt-1 text-xs text-muted-foreground">{p.briefDescription}</p>}
              </div>
            )}
            {p.keyParts && p.keyParts.length > 0 && (
              <ul className="mb-3 space-y-1">
                {p.keyParts.map((k, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <ListChecks className="mt-0.5 size-3.5 shrink-0 text-info" /> {k}
                  </li>
                ))}
              </ul>
            )}
            <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Provision extract</div>
            <blockquote className="mt-1 border-l-2 border-info/40 bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-foreground">
              “{p.sourceExtract}”
            </blockquote>
            <div className="mt-1.5 text-2xs text-muted-foreground">{p.citation}</div>
          </div>

          {/* Penalty tiers + severity */}
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
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={tier.severity} dense />
                        <span className="text-xs font-medium text-foreground">{tier.trigger}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{tier.consequence}</div>
                      {src && (
                        <button
                          onClick={() => navigate(`/sources/section/${tier.sourceRef}`)}
                          className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-info hover:underline"
                        >
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

          {/* Ingestion recommendation (maker) + review decision (checker) + actions */}
          {reviewable && (
            <div className="card-surface p-4">
              {p.aiRecommendation && (
                <div className="rounded-md border border-info/20 bg-info-soft/30 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-info" />
                    <span className="text-2xs font-semibold uppercase tracking-wide text-info">{p.aiRecommendation.agent} · recommends</span>
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-info" style={{ width: `${p.aiRecommendation.confidence}%` }} />
                      </span>
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
                  <span>· {p.reviewState?.toLowerCase()}</span>
                  {p.reviewedAt && <span>· {fmtDate(p.reviewedAt)}</span>}
                  {p.rationale && <span className="w-full text-foreground">“{p.rationale}”</span>}
                </div>
              )}

              {approved ? (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-ok/30 bg-ok-soft/40 px-3 py-2 text-xs text-foreground">
                  <CheckCircle2 className="size-4 text-ok" /> Approved and in action for tracking.
                </div>
              ) : canReview ? (
                <div className="mt-3">
                  <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Decision (maker-checker over the recommendation)</div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={onApprove}><CheckCircle2 className="size-4" /> Save to controls</Button>
                    <ActionBtn icon={<Eye className="size-3.5" />} label="Send for internal review" onClick={() => onRoute('Needs internal review', 'Routed to an internal SME / Legal for review.', 'Sent for internal review')} />
                    <ActionBtn icon={<UserSearch className="size-3.5" />} label="Request specialist" onClick={() => onRoute('Needs specialist', 'Referred to an external specialist for opinion.', 'Specialist requested')} />
                  </div>
                  <p className="mt-1.5 text-2xs text-muted-foreground">Save to controls approves the section, writes it to the Control Library and creates the tracked obligation.</p>
                </div>
              ) : (
                <p className="mt-3 text-2xs text-muted-foreground">Review actions are available to the Compliance Officer or Company Secretary. Switch role to act.</p>
              )}
            </div>
          )}
        </div>

        {/* Supporting column (tucked) */}
        <div className="space-y-4">
          {/* Source */}
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
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <a href={p.sourceLink ?? inst?.sourceLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-2xs font-medium text-info hover:underline">
                <ExternalLink className="size-3.5" /> Open full source
              </a>
              <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Upload newer version', description: 'Replace the source document with an updated artifact (session).', variant: 'success' })}>
                <Upload className="size-3.5" /> Newer version
              </Button>
            </div>
            {(p.attachedDocument ?? inst?.attachedDocument) && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
                <Paperclip className="size-3.5" /> {(p.attachedDocument ?? inst?.attachedDocument)!.filename}
              </div>
            )}
          </div>

          {/* When */}
          {(p.frequency || p.nextDue) && (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><CalendarClock className="size-4 text-info" /> How often / by when</h3>
              <div className="grid grid-cols-2 gap-3">
                <Meta label="Frequency">{p.frequency ?? '—'}</Meta>
                <Meta label="Next due">{p.nextDue ? fmtDate(p.nextDue) : '—'}</Meta>
              </div>
            </div>
          )}

          {/* Tracked records (flow tie-in both ways) */}
          {reviewable && (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Link2 className="size-4 text-info" /> Tracked records</h3>
              {linkedObligation ? (
                <button onClick={() => navigate(`/obligations/${linkedObligation.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-ok/30 bg-ok-soft/30 px-2 py-1.5 text-left hover:bg-ok-soft/60">
                  <CheckCircle2 className="size-3.5 shrink-0 text-ok" />
                  <span className="font-mono text-2xs font-semibold text-info">{linkedObligation.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{linkedObligation.title}</span>
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              ) : approved ? (
                <p className="text-2xs text-muted-foreground">Approved and saved to the Control Library as a consequence control — no separate filing obligation.</p>
              ) : (
                <p className="text-2xs text-muted-foreground">Not yet approved — no tracked obligation. The ingestion recommends the obligations below.</p>
              )}
              {p.linkedControlId && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-2xs text-muted-foreground">
                  <ShieldCheck className="size-3" /> Control Library entry <span className="font-mono font-semibold text-foreground">{p.linkedControlId}</span>
                </div>
              )}
              {recommended.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended obligations · {p.recommendedObligationIds.length}</div>
                  <div className="space-y-1">
                    {recommended.map((o) => (
                      <button key={o!.id} onClick={() => navigate(`/obligations/${o!.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-left hover:border-info/40 hover:bg-info-soft/40">
                        <span className="font-mono text-2xs font-semibold text-info">{o!.id}</span>
                        <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{o!.title}</span>
                        <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
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

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

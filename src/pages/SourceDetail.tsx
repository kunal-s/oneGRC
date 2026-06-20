import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, Scale, ScrollText, Paperclip, Upload, ExternalLink, History,
  Sparkles, CheckCircle2, XCircle, UserSearch, Eye, ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { getInstrument, getObligation } from '@/data'
import { provisionsForInstrument, effectiveReview, type ReviewOverrides } from '@/lib/sources'
import { personName } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import type { ReviewState, SourceReference } from '@/types'
import { ComingSoon } from './ComingSoon'

const REVIEW_TONE: Record<ReviewState, 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'progress'> = {
  'Confirmed applies': 'ok',
  'Not applicable': 'neutral',
  Recommended: 'info',
  'Needs expert opinion': 'danger',
  'Under internal review': 'progress',
}

const fmtPct = (n: number) => `${n.toFixed(1)}%`

export function SourceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const inst = id ? getInstrument(id) : undefined
  const pushToast = useApp((s) => s.pushToast)
  const role = useApp((s) => s.role)
  const overrides = useApp((s) => s.reviewOverrides)
  const setReviewState = useApp((s) => s.setReviewState)

  if (!inst) return <ComingSoon title="Instrument not found" />

  const provisions = provisionsForInstrument(inst.id)
  const supersedes = inst.supersedesId ? getInstrument(inst.supersedesId) : undefined
  const supersededBy = inst.supersededById ? getInstrument(inst.supersededById) : undefined
  // Only Compliance / Company Secretary may decide applicability (maker-checker
  // over the ingestion agent's recommendation). Other roles see it read-only.
  const canReview = role === 'COMPLIANCE' || role === 'COSEC'

  const reviewCount = provisions.filter((p) => effectiveReview(p, overrides)).length

  return (
    <div>
      <button onClick={() => navigate('/sources')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Source Library
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{inst.id}</span>
            <span className="rounded bg-info-soft px-1.5 py-0.5 text-2xs font-medium text-info">{inst.instrumentType}</span>
            <span className="text-muted-foreground">· {inst.authority}</span>
          </span>
        }
        title={inst.title}
        description={`${provisions.length} pinned provision${provisions.length === 1 ? '' : 's'}; ${reviewCount} carry an applicability review proposed by the ingestion process.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={inst.status} tone={inst.status === 'In force' ? 'ok' : inst.status === 'Superseded' ? 'warn' : 'neutral'} />
            <a href={inst.sourceLink} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="size-4" /> {inst.sourceChannel}
              </Button>
            </a>
          </div>
        }
      />

      {/* Supersession continuity */}
      {supersededBy && (
        <button
          onClick={() => navigate(`/sources/${supersededBy.id}`)}
          className="mb-4 flex w-full items-center gap-2 rounded-lg border border-medium/40 bg-medium-soft/40 px-3.5 py-2.5 text-left transition-colors hover:bg-medium-soft/70"
        >
          <History className="size-4 shrink-0 text-medium" />
          <span className="min-w-0 flex-1 text-sm text-foreground">
            Superseded by the newer version ({supersededBy.version} · {fmtDate(supersededBy.dateOfIssue)})
          </span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Provisions + reviews */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ScrollText className="size-4 text-info" /> Provisions referenced · {provisions.length}
          </h3>
          {provisions.map((p) => (
            <ProvisionCard
              key={p.id}
              provision={p}
              overrides={overrides}
              canReview={canReview}
              onAction={(state, rationale) => {
                setReviewState(p.id, state, rationale)
                pushToast({ title: state, description: `${p.id} — ${rationale}`, variant: 'success' })
              }}
              onOpenObligation={(oid) => navigate(`/obligations/${oid}`)}
            />
          ))}
        </div>

        {/* Instrument metadata */}
        <div className="space-y-4">
          <div className="card-surface p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Scale className="size-4 text-info" /> Instrument
            </h3>
            <Field label="Authority">{inst.authority}</Field>
            {inst.regulator && <Field label="Regulator">{inst.regulator}</Field>}
            <Field label="Type">{inst.instrumentType}</Field>
            {inst.referenceNumber && <Field label="Reference number">{inst.referenceNumber}</Field>}
            <Field label="Date of issue">{fmtDate(inst.dateOfIssue)}</Field>
            {inst.effectiveDate && <Field label="Effective date">{fmtDate(inst.effectiveDate)}</Field>}
            {inst.version && (
              <Field label="Version">
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span>{inst.version}</span>
                  {supersedes && (
                    <button
                      onClick={() => navigate(`/sources/${supersedes.id}`)}
                      className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-info transition-colors hover:bg-info-soft"
                    >
                      supersedes {supersedes.version} ({fmtDate(supersedes.dateOfIssue)})
                      <ArrowUpRight className="size-3" />
                    </button>
                  )}
                </span>
              </Field>
            )}
            <Field label="Channel">{inst.sourceChannel}</Field>
            <Field label="Status">{inst.status}</Field>
          </div>

          {inst.attachedDocument && (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Attached document</h3>
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2">
                <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{inst.attachedDocument.filename}</div>
                  <div className="text-2xs text-muted-foreground">
                    {inst.attachedDocument.label} · {inst.attachedDocument.sizeLabel} · attached {fmtDate(inst.attachedDocument.capturedAt)}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Upload newer version', description: 'Replace the attached instrument with an updated artifact.', variant: 'success' })}>
                  <Upload className="size-3.5" /> Replace
                </Button>
              </div>
              <p className="mt-2 text-2xs text-muted-foreground">Document storage and versioning are mocked in the prototype — the real artifact store is a backend item.</p>
            </div>
          )}

          <div className="card-surface p-3.5 text-2xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">One source model.</span> This instrument and its provisions
            are the same records the obligations, policies and control mappings cite — open any provision's source
            drawer elsewhere and it deep-links back here.
          </div>
        </div>
      </div>
    </div>
  )
}

function ProvisionCard({
  provision,
  overrides,
  canReview,
  onAction,
  onOpenObligation,
}: {
  provision: SourceReference
  overrides: ReviewOverrides
  canReview: boolean
  onAction: (state: ReviewState, rationale: string) => void
  onOpenObligation: (id: string) => void
}) {
  const review = effectiveReview(provision, overrides)
  const obligations = (review?.recommendedObligationIds ?? [])
    .map((oid) => getObligation(oid))
    .filter(Boolean)
    .slice(0, 6)
  const moreCount = (review?.recommendedObligationIds.length ?? 0) - obligations.length

  return (
    <div className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs font-semibold text-info">{provision.id}</span>
            <span className="text-sm font-semibold text-foreground">{provision.title}</span>
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">{provision.provision}</div>
        </div>
        {review && <StatusChip status={review.reviewState} tone={REVIEW_TONE[review.reviewState]} />}
      </div>

      <blockquote className="mt-2.5 border-l-2 border-info/40 bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-foreground">
        “{provision.sourceExtract}”
      </blockquote>

      {!review ? (
        <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
          Referenced by controls as a framework standard — no obligation applicability review.
        </p>
      ) : (
        <>
          {/* AI recommendation (the maker) */}
          <div className="mt-3 rounded-md border border-info/20 bg-info-soft/30 p-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-info" />
              <span className="text-2xs font-semibold uppercase tracking-wide text-info">{review.aiRecommendation.agent} · recommends</span>
              <span className="ml-auto inline-flex items-center gap-1.5">
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-info" style={{ width: `${review.aiRecommendation.confidence}%` }} />
                </span>
                <span className="text-2xs font-semibold tnum text-info">{fmtPct(review.aiRecommendation.confidence)}</span>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-foreground">{review.aiRecommendation.recommendation}</p>
            <p className="mt-1 text-2xs text-muted-foreground">Basis: {review.aiRecommendation.basis} · {fmtDate(review.aiRecommendation.at)}</p>
          </div>

          {/* Mapped obligations */}
          {obligations.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recommended obligations · {review.recommendedObligationIds.length}
              </div>
              <div className="space-y-1">
                {obligations.map((o) => (
                  <button
                    key={o!.id}
                    onClick={() => onOpenObligation(o!.id)}
                    className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left transition-colors hover:border-info/40 hover:bg-info-soft/40"
                  >
                    <span className="font-mono text-2xs font-semibold text-info">{o!.id}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{o!.title}</span>
                    <StatusChip status={o!.status} />
                    <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                ))}
                {moreCount > 0 && <div className="pl-2 text-2xs text-muted-foreground">+{moreCount} more</div>}
              </div>
            </div>
          )}

          {/* Reviewer decision (the checker) */}
          {review.reviewer && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-2xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-ok" />
              <span className="inline-flex items-center gap-1">
                <Avatar id={review.reviewer} size={16} /> <span className="font-medium text-foreground">{personName(review.reviewer)}</span>
              </span>
              <span>· {review.reviewState.toLowerCase()}</span>
              {review.reviewedAt && <span>· {fmtDate(review.reviewedAt)}</span>}
              {review.rationale && <span className="w-full text-foreground">“{review.rationale}”</span>}
            </div>
          )}

          {/* Compliance actions (maker-checker over the recommendation) */}
          {canReview ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionBtn icon={<CheckCircle2 className="size-3.5" />} label="Confirm applies" onClick={() => onAction('Confirmed applies', 'Confirmed applicable to SPF.')} />
              <ActionBtn icon={<XCircle className="size-3.5" />} label="Not applicable" onClick={() => onAction('Not applicable', 'Marked not applicable to SPF, with reason recorded.')} />
              <ActionBtn icon={<UserSearch className="size-3.5" />} label="Request expert opinion" onClick={() => onAction('Needs expert opinion', 'Referred to an external specialist for opinion.')} />
              <ActionBtn icon={<Eye className="size-3.5" />} label="Send for internal review" onClick={() => onAction('Under internal review', 'Sent for internal review.')} />
            </div>
          ) : (
            <p className="mt-3 text-2xs text-muted-foreground">
              Review actions are available to the Compliance Officer or Company Secretary. Switch role to act.
            </p>
          )}
        </>
      )}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-border py-1.5 last:border-0">
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground">{children}</div>
    </div>
  )
}

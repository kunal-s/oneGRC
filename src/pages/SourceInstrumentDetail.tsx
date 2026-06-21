import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Scale, Paperclip, Upload, ExternalLink, History, ChevronRight, FileInput } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Button } from '@/components/ui/Button'
import { getInstrument } from '@/data'
import { provisionsForInstrument, effectiveProvision, reviewTone, effectiveTriage, triageTone } from '@/lib/sources'
import { fmtDate, fmtIST } from '@/lib/time'
import { useApp } from '@/store'
import { ComingSoon } from './ComingSoon'

export function SourceInstrumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const inst = id ? getInstrument(id) : undefined
  const pushToast = useApp((s) => s.pushToast)
  const overrides = useApp((s) => s.reviewOverrides)
  const intakeOverrides = useApp((s) => s.intakeOverrides)

  if (!inst) return <ComingSoon title="Instrument not found" />

  const provisions = provisionsForInstrument(inst.id)
  const supersedes = inst.supersedesId ? getInstrument(inst.supersedesId) : undefined
  const supersededBy = inst.supersededById ? getInstrument(inst.supersededById) : undefined
  const triage = inst.intake ? effectiveTriage(inst, intakeOverrides) : undefined

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
        description={`${provisions.length} section${provisions.length === 1 ? '' : 's'} broken down for analysis — each carries its compliance fields and review status.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={inst.status} tone={inst.status === 'In force' ? 'ok' : inst.status === 'Superseded' ? 'warn' : 'neutral'} />
            <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Update version', description: 'New version uploaded; the prior version is marked superseded (session). Real document versioning is a backend item.', variant: 'success' })}>
              <Upload className="size-4" /> Update version
            </Button>
          </div>
        }
      />

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

      {inst.intake && triage && (
        <button
          onClick={() => navigate('/intake')}
          className="mb-4 flex w-full flex-wrap items-center gap-2 rounded-lg border border-info/30 bg-info-soft/40 px-3.5 py-2.5 text-left transition-colors hover:bg-info-soft/70"
        >
          <FileInput className="size-4 shrink-0 text-info" />
          <span className="min-w-0 flex-1 text-xs text-foreground">
            Arrived via Compliance Intake · {inst.intake.channel} · received {fmtIST(inst.intake.receivedAt)}
          </span>
          <StatusChip status={triage} tone={triageTone(triage)} />
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {/* Instrument header card */}
      <div className="card-surface mb-4 p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <Meta label="Authority">{inst.authority}</Meta>
          {inst.regulator && <Meta label="Regulator">{inst.regulator}</Meta>}
          <Meta label="Type">{inst.instrumentType}</Meta>
          {inst.referenceNumber && <Meta label="Reference">{inst.referenceNumber}</Meta>}
          <Meta label="Date of issue">{fmtDate(inst.dateOfIssue)}</Meta>
          {inst.effectiveDate && <Meta label="Effective date">{fmtDate(inst.effectiveDate)}</Meta>}
          {inst.version && (
            <Meta label="Version">
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <span>{inst.version}</span>
                {supersedes && (
                  <button
                    onClick={() => navigate(`/sources/${supersedes.id}`)}
                    className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-info transition-colors hover:bg-info-soft"
                  >
                    supersedes {supersedes.version}
                    <ArrowUpRight className="size-3" />
                  </button>
                )}
              </span>
            </Meta>
          )}
          <Meta label="Channel">{inst.sourceChannel}</Meta>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
          <a href={inst.sourceLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-info hover:underline">
            <ExternalLink className="size-3.5" /> Open at {inst.sourceChannel}
          </a>
          {inst.attachedDocument && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="size-3.5" /> {inst.attachedDocument.filename}
              <span className="text-2xs">· {inst.attachedDocument.sizeLabel}</span>
            </span>
          )}
        </div>
      </div>

      {/* Tabulated section breakdown */}
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Scale className="size-4 text-info" /> Sections · {provisions.length}
      </h3>
      <div className="card-surface overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Section</th>
              <th className="px-3 py-2">Name of compliance</th>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Frequency</th>
              <th className="px-3 py-2">Next due</th>
              <th className="px-3 py-2">Review status</th>
              <th className="w-8 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {provisions.map((p0) => {
              const p = effectiveProvision(p0, overrides)
              return (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/sources/section/${p.id}`)}
                  className="cursor-pointer border-b border-border text-sm transition-colors last:border-0 hover:bg-info-soft/40"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{p.title}</div>
                    <div className="font-mono text-2xs text-muted-foreground">{p.id}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{p.nameOfCompliance ?? <span className="text-muted-foreground">Framework reference</span>}</td>
                  <td className="px-3 py-2.5">{p.severity ? <SeverityBadge severity={p.severity} dense /> : <span className="text-2xs text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.frequency ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs tnum text-muted-foreground">{p.nextDue ? fmtDate(p.nextDue) : '—'}</td>
                  <td className="px-3 py-2.5">{p.reviewState ? <StatusChip status={p.reviewState} tone={reviewTone(p.reviewState)} /> : <span className="text-2xs text-muted-foreground">Reference</span>}</td>
                  <td className="px-3 py-2.5"><ChevronRight className="size-4 text-muted-foreground" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-2xs text-muted-foreground">
        The heavier fields — description, key parts, penalty tiers and the ingestion recommendation — open in the section detail.
      </p>
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

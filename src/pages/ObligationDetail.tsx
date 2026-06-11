import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Upload, Send, CheckCircle2, GitPullRequestArrow, ArrowUpRight, FileCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { EvidenceList } from '@/components/EvidenceList'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { MakerCheckerChain } from '@/components/MakerChecker'
import { RegulatorChip } from '@/lib/regulators'
import { cn } from '@/lib/utils'
import { getObligation, getRegChange, WORLD } from '@/data'
import { PEOPLE_BY_ID } from '@/data/people'
import { fmtIST, fmtRelative, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { ComingSoon } from './ComingSoon'

export function ObligationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const openDrawer = useApp((s) => s.openDrawer)
  const o = id ? getObligation(id) : undefined

  if (!o) return <ComingSoon title="Obligation not found" />

  const owner = PEOPLE_BY_ID[o.owner]
  const evidence = o.evidence.map((e) => WORLD.evidence.find((x) => x.id === e)).filter(Boolean) as typeof WORLD.evidence
  const regChange = o.linkedRegChange ? getRegChange(o.linkedRegChange) : undefined
  const overdue = o.status === 'Overdue'
  const daysToDue = Math.round((new Date(o.dueDate).getTime() - NOW_MS) / 86400000)

  return (
    <div>
      <button onClick={() => navigate('/obligations')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Obligations & Calendar
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{o.id}</span>
            <RegulatorChip regulator={o.regulator} />
            <span className="text-muted-foreground">· {o.frequency} · ref {o.reference}</span>
          </span>
        }
        title={o.title}
        description={`Filed with ${o.regulator}; owned by ${owner.name} (${owner.title}) under maker-checker control.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={o.status} />
            {o.status !== 'Filed' && (
              <Button size="sm" onClick={() => pushToast({ title: o.status === 'In review' ? 'Approved for filing' : 'Submitted for check', description: `${o.id} ${o.status === 'In review' ? 'approved (maker-checker)' : 'sent to checker'}.`, variant: 'success' })}>
                {o.status === 'In review' ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
                {o.status === 'In review' ? 'Approve filing' : 'Submit for check'}
              </Button>
            )}
          </div>
        }
      />

      <div className={cn('mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3.5 py-2.5', overdue ? 'border-critical/30 bg-critical-soft/40' : 'border-border bg-muted/30')}>
        <CalendarClock className={cn('size-4', overdue ? 'text-critical' : 'text-muted-foreground')} />
        <span className="text-sm font-medium text-foreground">Due {fmtIST(o.dueDate)}</span>
        <span className={cn('text-xs', overdue ? 'font-medium text-critical' : 'text-muted-foreground')}>
          {overdue ? `overdue by ${Math.abs(daysToDue)} days` : `${daysToDue} days remaining`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="card-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Maker-checker</h3>
            <MakerCheckerChain mc={o.makerChecker} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Attr label="Owner">
                <span className="inline-flex items-center gap-1.5"><Avatar id={o.owner} size={20} /> <span className="text-xs">{owner.name}</span></span>
              </Attr>
              <Attr label="Regulator">{o.regulator}</Attr>
              <Attr label="Frequency">{o.frequency}</Attr>
              <Attr label="Reference">{o.reference}</Attr>
            </div>
          </div>

          <div className="card-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <FileCheck className="size-4 text-ok" /> Evidence & filing acknowledgements
              </h3>
              <Button variant="outline" size="sm" onClick={() => openDrawer({ kind: 'evidence-upload', title: `Attach filing ack — ${o.id}` })}>
                <Upload className="size-4" /> Upload ack
              </Button>
            </div>
            <EvidenceList items={evidence} />
            <p className="mt-2 text-2xs text-muted-foreground">Filing acknowledgements and supporting evidence are retained on the obligation record and reused for audit.</p>
          </div>
        </div>

        <div className="space-y-4">
          {regChange ? (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <GitPullRequestArrow className="size-4 text-info" /> Source regulatory change
              </h3>
              <button
                onClick={() => navigate(`/reg-change/${regChange.id}`)}
                className="group block w-full rounded-md border border-border bg-background p-2.5 text-left hover:border-info/40 hover:bg-info-soft/40"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xs font-semibold text-info">{regChange.id}</span>
                  <StatusChip status={regChange.status} />
                  <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-1 text-xs text-foreground">{regChange.summary}</div>
                <div className="mt-0.5 text-2xs text-muted-foreground">{regChange.source} · {fmtRelative(regChange.publishedAt)}</div>
              </button>
              <p className="mt-2 text-2xs text-muted-foreground">This obligation was created/updated automatically when the change was ingested.</p>
            </div>
          ) : (
            <div className="card-surface p-3.5 text-2xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">No open change.</span> This obligation is steady-state; any
              future statutory amendment from the RegTech feeds will update it here automatically.
            </div>
          )}

          <div className="card-surface p-3.5 text-2xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">One calendar.</span> This filing sits alongside every other
            regulator's deadlines on the same calendar, with the same maker-checker discipline and the same evidence
            vault — no separate spreadsheet per regulator.
          </div>
        </div>
      </div>
    </div>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

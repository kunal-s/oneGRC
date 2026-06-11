import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ClipboardCheck, ArrowRight, Wrench, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getAudit, getIssue } from '@/data'
import { useApp } from '@/store'
import { ComingSoon } from './ComingSoon'

export function AuditDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const openDrawer = useApp((s) => s.openDrawer)
  const audit = id ? getAudit(id) : undefined

  if (!audit) return <ComingSoon title="Audit not found" />

  const open = audit.findings.filter((f) => f.status !== 'Closed')
  const closed = audit.findings.filter((f) => f.status === 'Closed')

  return (
    <div>
      <button onClick={() => navigate('/audits')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Audits
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <ClipboardCheck className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-info">{audit.id}</span>
            <span className="text-muted-foreground">· {audit.type}</span>
          </span>
        }
        title={audit.title}
        description={`${audit.auditor} · ${audit.period}. Scope: ${audit.scope}.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={audit.status} />
            <Button variant="outline" size="sm" onClick={() => openDrawer({ kind: 'export-pdf', title: `Audit report — ${audit.id}`, payload: { filename: `${audit.id}-audit-report.pdf` } })}>
              <Download className="size-4" /> Export report
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Auditor" value={audit.auditor} small />
        <Stat label="Period" value={audit.period} />
        <Stat label="Open findings" value={String(open.length)} tone="danger" />
        <Stat label="Closed findings" value={String(closed.length)} tone="ok" />
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Findings → remediation issues</h3>
        <p className="mb-3 text-xs text-muted-foreground">Each finding spawns a tracked Issue with an owner and due date — closing the assurance loop.</p>
        <div className="space-y-1.5">
          {[...open, ...closed].map((f) => {
            const issue = f.linkedIssue ? getIssue(f.linkedIssue) : undefined
            return (
              <div key={f.id} className="flex flex-col gap-2 rounded-lg border border-border p-2.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <SeverityBadge severity={f.severity} dense />
                  <span className="font-mono text-2xs text-muted-foreground">{f.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{f.title}</span>
                  <StatusChip status={f.status} />
                </div>
                {issue ? (
                  <>
                    <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                    <button
                      onClick={() => navigate(`/issues/${issue.id}`)}
                      className="group flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-left hover:border-info/40 hover:bg-info-soft/40 sm:w-56"
                    >
                      <Wrench className="size-3.5 text-medium" />
                      <span className="font-mono text-2xs font-semibold text-info">{issue.id}</span>
                      <StatusChip status={issue.status} className="ml-auto" />
                    </button>
                  </>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-2xs text-ok sm:w-56">
                    <CheckCircle2 className="size-3.5" /> No remediation required
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone, small }: { label: string; value: string; tone?: 'ok' | 'danger'; small?: boolean }) {
  return (
    <div className="card-surface p-3">
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 font-semibold text-foreground', small ? 'text-xs' : 'text-lg tnum', tone === 'danger' ? 'text-critical' : tone === 'ok' ? 'text-ok' : '')}>{value}</div>
    </div>
  )
}

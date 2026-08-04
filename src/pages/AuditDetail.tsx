import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ClipboardCheck, ArrowRight, Wrench, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { useEffectiveAudit, useEffectiveIssues } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { ComingSoon } from './ComingSoon'

export function AuditDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const openDrawer = useApp((s) => s.openDrawer)
  const closeFinding = useApp((s) => s.closeFinding)
  const pushToast = useApp((s) => s.pushToast)
  const canClose = useCanAct({ kind: 'issue.resolve' })
  const audit = useEffectiveAudit(id ?? '')
  const issues = useEffectiveIssues()

  if (!audit) return <ComingSoon title="Audit not found" />

  const issueById = (iid?: string) => (iid ? issues.find((x) => x.id === iid) : undefined)
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
            const issue = issueById(f.linkedIssue)
            const canCloseThis = f.status !== 'Closed' && !!f.linkedIssue && canClose
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
                    <CheckCircle2 className="size-3.5" /> {f.status === 'Closed' ? 'Finding closed' : 'No remediation required'}
                  </span>
                )}
                {f.status !== 'Closed' && f.linkedIssue && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={!canCloseThis}
                    title={canClose ? undefined : 'Closing a finding (resolving its remediation) is done by the Control Owner, Auditor or Compliance Manager.'}
                    onClick={() => {
                      closeFinding(audit.id, f.id)
                      pushToast({ title: 'Finding closed', description: `${f.id} closed — remediation ${f.linkedIssue} resolved.`, variant: 'success' })
                    }}
                  >
                    <CheckCircle2 className="size-4" /> Close finding
                  </Button>
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

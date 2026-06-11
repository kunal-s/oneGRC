import { FileText, FileCode, Image, ShieldCheck, ReceiptText, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Evidence } from '@/types'
import { getEvidence } from '@/data'
import { fmtRelative, fmtIST } from '@/lib/time'
import { personName } from '@/data/people'

const ICON: Record<Evidence['type'], React.ComponentType<{ className?: string }>> = {
  Screenshot: Image,
  Log: FileText,
  'Config export': FileCode,
  Attestation: ShieldCheck,
  'Filing ack': ReceiptText,
}

export function EvidenceList({
  ids,
  items,
  className,
  max,
}: {
  ids?: string[]
  items?: Evidence[]
  className?: string
  max?: number
}) {
  const list = (items ?? (ids ?? []).map((id) => getEvidence(id)).filter(Boolean) as Evidence[])
  const shown = max ? list.slice(0, max) : list
  return (
    <div className={cn('divide-y divide-border rounded-lg border border-border', className)}>
      {shown.map((ev) => {
        const Icon = ICON[ev.type]
        return (
          <div key={ev.id} className="flex items-center gap-3 px-3 py-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xs font-semibold text-info">{ev.id}</span>
                <span className="truncate text-xs text-foreground">{ev.title}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground">
                <span>{ev.type}</span>
                <span>·</span>
                <span title={fmtIST(ev.capturedAt)}>{fmtRelative(ev.capturedAt)}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  {ev.auto ? <Bot className="size-3 text-ok" /> : <User className="size-3" />}
                  {ev.auto ? 'CCM (auto)' : personName(ev.capturedBy)}
                </span>
              </div>
            </div>
            {ev.auto && (
              <span className="rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok">auto</span>
            )}
          </div>
        )
      })}
      {shown.length === 0 && (
        <div className="px-3 py-3 text-xs text-muted-foreground">No evidence linked yet.</div>
      )}
    </div>
  )
}

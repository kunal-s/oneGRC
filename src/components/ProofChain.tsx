import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ScrollText, ShieldCheck, FileText, Paperclip, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SpineKind = 'source' | 'control' | 'obligation' | 'evidence' | 'task'

export interface SpineLinks {
  source?: string[]
  control?: string[]
  obligation?: string[]
  evidence?: string[]
  task?: string[]
}

const META: Record<SpineKind, { label: string; icon: React.ReactNode; route: (id: string) => string; tone: 'info' | 'ok' }> = {
  source: { label: 'Source clause', icon: <ScrollText className="size-3.5" />, route: (id) => `/sources/section/${id}`, tone: 'info' },
  control: { label: 'Control', icon: <ShieldCheck className="size-3.5" />, route: (id) => `/controls/${id}`, tone: 'info' },
  obligation: { label: 'Obligation', icon: <FileText className="size-3.5" />, route: (id) => `/obligations/${id}`, tone: 'info' },
  evidence: { label: 'Evidence', icon: <Paperclip className="size-3.5" />, route: (id) => `/evidence/${id}`, tone: 'ok' },
  task: { label: 'Task', icon: <ClipboardCheck className="size-3.5" />, route: (id) => `/tasks/${id}`, tone: 'info' },
}

const ORDER: SpineKind[] = ['source', 'control', 'obligation', 'evidence', 'task']

/** Shared 5-node spine: Source → Control → Obligation → Evidence → Task.
 *  `entry` is the entity being viewed (highlighted, not clickable).
 *  Each kind takes an array of ids; the first is the primary jump-link and
 *  "+N" surfaces the remaining siblings via a small popover. */
export function ProofChain({ entry, links, className }: { entry: SpineKind; links: SpineLinks; className?: string }) {
  return (
    <div className={cn('card-surface p-3.5', className)}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Proof chain</h3>
        <span className="text-2xs text-muted-foreground">Source → Control → Obligation → Evidence → Task</span>
      </div>
      <div className="flex flex-wrap items-stretch gap-1.5">
        {ORDER.map((k, i) => (
          <React.Fragment key={k}>
            {i > 0 && (
              <span className="flex items-center text-muted-foreground">
                <ChevronRight className="size-4" />
              </span>
            )}
            <Node kind={k} ids={links[k] ?? []} current={entry === k} />
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function Node({ kind, ids, current }: { kind: SpineKind; ids: string[]; current: boolean }) {
  const navigate = useNavigate()
  const meta = META[kind]
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const primary = ids[0]
  const extra = Math.max(0, ids.length - 1)
  const clickable = !current && !!primary
  const toneClass = meta.tone === 'ok' ? 'text-ok' : 'text-info'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => clickable && navigate(meta.route(primary!))}
        disabled={!clickable}
        className={cn(
          'flex min-w-[140px] flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors',
          current
            ? 'border-primary bg-primary/10'
            : primary
              ? 'border-border bg-background hover:border-info/40 hover:bg-info-soft/40'
              : 'border-dashed border-border bg-muted/30',
          !clickable && 'cursor-default',
        )}
      >
        <span className="flex items-center gap-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          {meta.icon} {meta.label}
        </span>
        <span className={cn('flex items-center gap-1 font-mono text-2xs font-semibold', primary ? toneClass : 'text-muted-foreground')}>
          <span className="truncate">{primary ?? 'none yet'}</span>
          {extra > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setOpen((v) => !v) } }}
              className="rounded bg-muted px-1 py-0 text-2xs font-semibold text-muted-foreground hover:bg-info-soft hover:text-info"
            >
              +{extra}
            </span>
          )}
        </span>
      </button>
      {open && extra > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-md border border-border bg-background p-1 shadow-md">
          {ids.slice(1).map((id) => (
            <button
              key={id}
              onClick={() => { setOpen(false); navigate(meta.route(id)) }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-2xs hover:bg-info-soft/40"
            >
              <span className={cn('font-mono font-semibold', toneClass)}>{id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
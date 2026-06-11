import { useNavigate } from 'react-router-dom'
import { Search, Bell, ChevronsUpDown, Building2 } from 'lucide-react'
import { useApp } from '@/store'
import { RoleSwitcher } from '../RoleSwitcher'

export function TopBar() {
  const setCommandOpen = useApp((s) => s.setCommandOpen)
  const pushToast = useApp((s) => s.pushToast)
  const navigate = useNavigate()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      {/* Org switcher */}
      <button className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 transition-colors hover:bg-muted">
        <div className="flex size-6 items-center justify-center rounded bg-primary/10 text-primary">
          <Building2 className="size-3.5" />
        </div>
        <div className="text-left leading-tight">
          <div className="text-xs font-semibold text-foreground">Sankalp Pension Funds</div>
          <div className="text-2xs text-muted-foreground">PFRDA NPS Pension Fund Manager</div>
        </div>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </button>

      {/* Command search trigger */}
      <button
        onClick={() => setCommandOpen(true)}
        className="group flex h-9 max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="text-sm">Search risks, controls, incidents, obligations…</span>
        <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-2xs font-medium">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() =>
            pushToast({
              title: '3 notifications',
              description: 'CERT-In clock at 03:11 · GSTR-3B reg-change ingested · CCM rule failing',
              variant: 'info',
            })
          }
          className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4.5" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-critical" />
        </button>
        <button
          onClick={() => navigate('/incidents/INC-2026-0411')}
          className="hidden items-center gap-1.5 rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1.5 text-xs font-medium text-critical transition-colors hover:bg-critical-soft/70 xl:flex"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-critical" />
          1 Critical incident live
        </button>
        <div className="mx-1 h-6 w-px bg-border" />
        <RoleSwitcher />
      </div>
    </header>
  )
}

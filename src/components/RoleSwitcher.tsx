import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { ROLES, PEOPLE_BY_ID } from '@/data/people'
import { Avatar } from './Avatar'

export function RoleSwitcher() {
  const role = useApp((s) => s.role)
  const setRole = useApp((s) => s.setRole)
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const current = ROLES.find((r) => r.key === role)!
  const person = PEOPLE_BY_ID[current.person]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-background py-1 pl-1 pr-2 transition-colors hover:bg-muted"
      >
        <Avatar id={current.person} size={26} />
        <span className="hidden text-left lg:block">
          <span className="block text-xs font-semibold leading-tight text-foreground">{current.label}</span>
          <span className="block text-2xs leading-tight text-muted-foreground">{person.name}</span>
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background p-1 shadow-lg animate-slide-up">
          <div className="px-2 py-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Switch persona
          </div>
          {ROLES.map((r) => {
            const p = PEOPLE_BY_ID[r.person]
            const active = r.key === role
            return (
              <button
                key={r.key}
                onClick={() => {
                  setRole(r.key)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted',
                  active && 'bg-info-soft/60',
                )}
              >
                <Avatar id={r.person} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground">{r.label}</div>
                  <div className="text-2xs text-muted-foreground">
                    {p.name} · {p.lod}
                  </div>
                </div>
                {active && <Check className="size-4 text-info" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

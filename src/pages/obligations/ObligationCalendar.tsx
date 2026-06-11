import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REGULATOR_COLORS } from '@/lib/regulators'
import { NOW_MS } from '@/lib/time'
import type { Obligation } from '@/types'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const IST_OFFSET = (5 * 60 + 30) * 60000

// IST calendar parts for a date
function istYMD(ms: number) {
  const d = new Date(ms + IST_OFFSET)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate() }
}

export function ObligationCalendar({ obligations }: { obligations: Obligation[] }) {
  const navigate = useNavigate()
  const nowParts = istYMD(NOW_MS)
  const [view, setView] = React.useState({ y: nowParts.y, m: nowParts.m })

  const byDay = React.useMemo(() => {
    const map = new Map<string, Obligation[]>()
    for (const o of obligations) {
      const p = istYMD(new Date(o.dueDate).getTime())
      const key = `${p.y}-${p.m}-${p.day}`
      ;(map.get(key) ?? map.set(key, []).get(key)!).push(o)
    }
    return map
  }, [obligations])

  const firstDow = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const move = (delta: number) => {
    setView((v) => {
      const m = v.m + delta
      if (m < 0) return { y: v.y - 1, m: 11 }
      if (m > 11) return { y: v.y + 1, m: 0 }
      return { y: v.y, m }
    })
  }

  const monthCount = obligations.filter((o) => {
    const p = istYMD(new Date(o.dueDate).getTime())
    return p.y === view.y && p.m === view.m
  }).length

  return (
    <div className="card-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="rounded-md border border-border p-1 hover:bg-muted">
            <ChevronLeft className="size-4" />
          </button>
          <div className="w-40 text-center text-sm font-semibold text-foreground">
            {MONTHS[view.m]} {view.y}
          </div>
          <button onClick={() => move(1)} className="rounded-md border border-border p-1 hover:bg-muted">
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => setView({ y: nowParts.y, m: nowParts.m })}
            className="ml-1 rounded-md border border-border px-2 py-1 text-2xs font-medium text-muted-foreground hover:bg-muted"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
          <span className="tnum">{monthCount} due this month</span>
          <span className="h-3 w-px bg-border" />
          {Object.entries(REGULATOR_COLORS).map(([r, c]) => (
            <span key={r} className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full" style={{ background: c.dot }} />
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="px-1 py-0.5 text-center text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-[78px] rounded-md bg-muted/20" />
          const key = `${view.y}-${view.m}-${day}`
          const items = byDay.get(key) ?? []
          const isToday = view.y === nowParts.y && view.m === nowParts.m && day === nowParts.day
          return (
            <div
              key={i}
              className={cn(
                'min-h-[78px] rounded-md border p-1',
                isToday ? 'border-info bg-info-soft/30' : 'border-border bg-background',
              )}
            >
              <div className={cn('mb-0.5 text-2xs font-semibold tnum', isToday ? 'text-info' : 'text-muted-foreground')}>
                {day}
                {isToday && <span className="ml-1 font-normal">today</span>}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((o) => {
                  const c = REGULATOR_COLORS[o.regulator]
                  const overdue = o.status === 'Overdue'
                  return (
                    <button
                      key={o.id}
                      onClick={() => navigate(`/obligations/${o.id}`)}
                      title={`${o.regulator} · ${o.title} · ${o.status}`}
                      className={cn(
                        'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-2xs',
                        overdue ? 'bg-critical-soft text-critical' : 'hover:bg-muted',
                      )}
                    >
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: overdue ? undefined : c.dot }} />
                      <span className="truncate">{o.title}</span>
                    </button>
                  )
                })}
                {items.length > 3 && (
                  <div className="px-1 text-2xs text-muted-foreground">+{items.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

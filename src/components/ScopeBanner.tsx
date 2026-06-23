import { Building2, Eye } from 'lucide-react'
import { useScope } from '@/lib/access'
import { cn } from '@/lib/utils'

/**
 * The persistent department-scope strip (enhancement plan 1.1). It states, in
 * plain language, whether the current user sees every department (Compliance /
 * Administrator) or only their own — so the access boundary is visible, not
 * implied. `entity` names what the surrounding list holds (e.g. "obligations").
 */
export function ScopeBanner({ entity, className }: { entity: string; className?: string }) {
  const scope = useScope()
  return (
    <div
      className={cn(
        'mb-3 flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs',
        scope.seesAll ? 'border-info/30 bg-info-soft/40' : 'border-border bg-muted/40',
        className,
      )}
    >
      {scope.seesAll ? <Eye className="size-3.5 shrink-0 text-info" /> : <Building2 className="size-3.5 shrink-0 text-muted-foreground" />}
      {scope.seesAll ? (
        <span className="text-foreground">
          <span className="font-medium">All departments.</span> Compliance and Administrator see every {entity} across the firm.
        </span>
      ) : (
        <span className="text-foreground">
          <span className="font-medium">Department scope · {scope.department}.</span> You see only the {entity} owned by your department; other departments are not shown.
        </span>
      )}
    </div>
  )
}

/** Shown in place of a list when a department legitimately has no records of a
 *  kind under the access boundary — this is the boundary working, not a gap. */
export function ScopeEmpty({ entity }: { entity: string }) {
  const scope = useScope()
  return (
    <div className="card-surface flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Building2 className="size-6 text-muted-foreground" />
      <div className="text-sm font-medium text-foreground">No {entity} in your department</div>
      <div className="max-w-md text-xs text-muted-foreground">
        The {scope.department} department owns no {entity}. Switch to the Compliance Manager or Administrator role (top-right) to see every department.
      </div>
    </div>
  )
}

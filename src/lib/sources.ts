// Source & Provenance helpers (Epic 1). Forward: a record's instrument sources.
// Reverse (Story 1.2): a source resolves to the records that cite it.
import { WORLD, getSource } from '@/data'
import type { SourceReference } from '@/types'

export { getSource }

export function allSources(): SourceReference[] {
  return WORLD.sources
}

/**
 * Reverse lookup — every obligation, policy and control that cites this source.
 * Used by the source viewer's "What this source produced" section.
 */
export function citingRecords(srcId: string): string[] {
  const ids: string[] = []
  for (const o of WORLD.obligations) {
    if (o.sourceRefs?.includes(srcId)) ids.push(o.id)
  }
  for (const p of WORLD.policies) {
    if (p.sourceRefs?.includes(srcId)) ids.push(p.id)
  }
  for (const c of WORLD.controls) {
    if (c.sourceRefs?.includes(srcId) || c.mappedFrameworkRefs.some((m) => m.sourceRef === srcId)) {
      ids.push(c.id)
    }
  }
  return ids
}

import { WORLD } from '@/data'
import type { RegulatorTrack } from '@/types'

export interface ActiveTrack {
  incidentId: string
  incidentTitle: string
  track: RegulatorTrack
}

/** All regulator tracks that are still running (not Filed), across open incidents. */
export function activeTracks(): ActiveTrack[] {
  const out: ActiveTrack[] = []
  for (const inc of WORLD.incidents) {
    if (inc.status === 'Closed') continue
    for (const track of inc.regulatorTracks) {
      if (track.status === 'Filed') continue
      out.push({ incidentId: inc.id, incidentTitle: inc.title, track })
    }
  }
  return out.sort((a, b) => new Date(a.track.deadline).getTime() - new Date(b.track.deadline).getTime())
}

/** The nearest (soonest-deadline) live regulator clock. */
export function nearestTrack(): ActiveTrack | undefined {
  return activeTracks()[0]
}

// Map an entity id to its detail route + a human label, for cross-references.
import {
  getRisk, getControl, getObligation, getIncident, getPolicy, getIssue,
  getEvidence, getAudit, getRegChange, getDsar, getSource, getInstrument,
} from '@/data'

export interface EntityRef {
  id: string
  route: string
  label: string
  type: string
}

export function resolveEntity(id: string): EntityRef {
  if (id.startsWith('RISK-')) return { id, route: `/risks/${id}`, label: getRisk(id)?.title ?? id, type: 'Risk' }
  if (id.startsWith('CTRL-')) return { id, route: `/controls/${id}`, label: getControl(id)?.title ?? id, type: 'Control' }
  if (id.startsWith('OBL-')) return { id, route: `/obligations/${id}`, label: getObligation(id)?.title ?? id, type: 'Obligation' }
  if (id.startsWith('INC-')) return { id, route: `/incidents/${id}`, label: getIncident(id)?.title ?? id, type: 'Incident' }
  if (id.startsWith('POL-')) return { id, route: `/policies/${id}`, label: getPolicy(id)?.title ?? id, type: 'Policy' }
  if (id.startsWith('ISS-')) return { id, route: `/issues/${id}`, label: getIssue(id)?.title ?? id, type: 'Issue' }
  if (id.startsWith('EVD-')) return { id, route: `/evidence`, label: getEvidence(id)?.title ?? id, type: 'Evidence' }
  if (id.startsWith('AUD-')) return { id, route: `/audits/${id}`, label: getAudit(id)?.title ?? id, type: 'Audit' }
  if (id.startsWith('RCM-')) return { id, route: `/reg-change/${id}`, label: getRegChange(id)?.summary ?? id, type: 'Reg-change' }
  if (id.startsWith('DSAR-')) return { id, route: `/dpdp/dsar/${id}`, label: getDsar(id)?.type ?? id, type: 'DSAR' }
  if (id.startsWith('DA-')) return { id, route: '/dpdp', label: id, type: 'Data asset' }
  // Instruments have a full-page route; provisions open the drawer (see SourceRef).
  if (id.startsWith('INST-')) return { id, route: `/sources/${id}`, label: getInstrument(id)?.title ?? id, type: 'Instrument' }
  if (id.startsWith('SRC-')) return { id, route: '#source', label: getSource(id)?.title ?? id, type: 'Source' }
  return { id, route: '/', label: id, type: 'Item' }
}

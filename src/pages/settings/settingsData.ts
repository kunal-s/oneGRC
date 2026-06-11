import { WORLD } from '@/data'
import { minsFromNow } from '@/lib/time'
import type { RoleKey } from '@/types'

// ── Organisation profile ────────────────────────────────────────────────────
export const ORG = {
  name: 'Sankalp Pension Funds Pvt. Ltd.',
  pfrdaReg: 'PFRDA/PFM/2014/03',
  entityType: 'NPS Pension Fund Manager (Category I Regulated Entity)',
  parent: 'Sankalp Bank',
  cin: 'U66020MH2014PTC2••••7',
  pan: 'AABCS••••2F',
  gstin: '27AABCS••••2F1Z9',
  office: 'Sankalp House, Bandra-Kurla Complex, Mumbai 400051',
  schemes: 'Scheme E / C / G / A · Tier I & II · CG / SG / Corporate / APY',
  aumCrore: 324718,
  subscribers: 4186902,
  fyClose: '31 March',
  ratingAgency: 'CRISIL · ICRA',
}

// ── Platform roles & permission summaries ───────────────────────────────────
export interface RoleDef {
  key: string
  label: string
  lod: string
  members: number
  switcher: boolean
  summary: string
}

export const ROLE_DEFS: RoleDef[] = [
  { key: 'CRO', label: 'Chief Risk Officer', lod: '2nd line', members: 1, switcher: true, summary: 'Full enterprise read; approves risk treatment, board pack, overdue-obligation remediation.' },
  { key: 'CISO', label: 'CISO', lod: '2nd line', members: 1, switcher: true, summary: 'Security risk & controls; signs off CERT-In submissions; manages incidents and CCM.' },
  { key: 'COMPLIANCE', label: 'Head of Compliance', lod: '2nd line', members: 1, switcher: true, summary: 'Obligations, regulatory change, DPDP; checker on filings and consent.' },
  { key: 'COSEC', label: 'Company Secretary', lod: '2nd line', members: 1, switcher: true, summary: 'Companies Act filings, committee cadence, board minutes and secretarial returns.' },
  { key: 'AUDIT', label: 'Head of Internal Audit', lod: '3rd line', members: 1, switcher: true, summary: 'Independent assurance; audits, findings and issue verification. Read-mostly elsewhere.' },
  { key: 'INVCOMP', label: 'Head of Investment Compliance', lod: '2nd line', members: 1, switcher: true, summary: 'Exposure limits, NAV integrity, PFRDA investment returns and committee evidence.' },
  { key: 'SECOPS', label: 'SecOps', lod: '1st line', members: 1, switcher: false, summary: 'Detect, triage and contain incidents; operate detective controls and evidence capture.' },
  { key: 'DPO', label: 'Data Protection Officer', lod: '2nd line', members: 1, switcher: false, summary: 'DPDP data inventory, consent ledger and DSAR handling; breach intimation owner.' },
  { key: 'ADMIN', label: 'Platform Administrator', lod: '2nd line', members: 2, switcher: false, summary: 'Configure frameworks, integrations, maker-checker policy and user access. No filing rights.' },
]

export const ROLE_LABEL: Record<RoleKey, string> = {
  CRO: 'CRO',
  CISO: 'CISO',
  COMPLIANCE: 'Compliance',
  COSEC: 'Company Secretary',
  AUDIT: 'Internal Audit',
  INVCOMP: 'Investment Compliance',
}

// ── Per-user admin metadata (status + last active) ──────────────────────────
export const USER_META: Record<string, { status: 'Active' | 'Invited' | 'Away'; lastMins: number }> = {
  meera: { status: 'Active', lastMins: 6 },
  rajesh: { status: 'Active', lastMins: 2 },
  anjali: { status: 'Active', lastMins: 19 },
  vikram: { status: 'Active', lastMins: 142 },
  sunita: { status: 'Active', lastMins: 73 },
  arvind: { status: 'Active', lastMins: 38 },
  karthik: { status: 'Active', lastMins: 1 },
  priya: { status: 'Active', lastMins: 27 },
  rohan: { status: 'Active', lastMins: 54 },
  deepa: { status: 'Active', lastMins: 96 },
  farhan: { status: 'Away', lastMins: 1880 },
  neha: { status: 'Active', lastMins: 4 },
  sanjay: { status: 'Active', lastMins: 61 },
  lakshmi: { status: 'Active', lastMins: 210 },
  imran: { status: 'Invited', lastMins: 4320 },
}

// ── Frameworks configuration ────────────────────────────────────────────────
export interface FwConfig {
  framework: 'ISO 27001' | 'NIST CSF' | 'PCI DSS' | 'PFRDA ICS' | 'COBIT'
  name: string
  version: string
  enabled: boolean
  mapped: number
  crosswalk?: boolean
  lastUpdate: string
}

function countFw(f: 'ISO 27001' | 'NIST CSF' | 'PCI DSS' | 'PFRDA ICS') {
  return WORLD.controls.filter((c) => c.frameworks.includes(f)).length
}

export const FRAMEWORKS: FwConfig[] = [
  { framework: 'ISO 27001', name: 'ISO/IEC 27001', version: '2022', enabled: true, mapped: countFw('ISO 27001'), lastUpdate: '14 Apr 2026' },
  { framework: 'NIST CSF', name: 'NIST CSF', version: '2.0', enabled: true, mapped: countFw('NIST CSF'), lastUpdate: '22 Mar 2026' },
  { framework: 'PCI DSS', name: 'PCI DSS', version: '4.0', enabled: true, mapped: countFw('PCI DSS'), lastUpdate: '9 Feb 2026' },
  { framework: 'PFRDA ICS', name: 'PFRDA ICS Guidelines', version: '2024 + circular PFRDA/2025/05/ICS/01', enabled: true, mapped: countFw('PFRDA ICS'), lastUpdate: '3 May 2026' },
  { framework: 'COBIT', name: 'COBIT (governance overlay)', version: '2019', enabled: true, mapped: 58, crosswalk: true, lastUpdate: '11 Jan 2026' },
]

export const TOTAL_CONTROLS = WORLD.controls.length

// ── Regulator clock configuration ───────────────────────────────────────────
export interface RegClockCfg {
  regulator: string
  thresholds: string[]
  retention: string
  sync?: string
  owner: string
  escalation: string
  note?: string
}

export const REG_CLOCKS: RegClockCfg[] = [
  {
    regulator: 'CERT-In',
    thresholds: ['Incident report within 6 hours of detection (Direction 20(3)/2022)'],
    retention: '180-day in-India security log retention',
    sync: 'NIC / NPL NTP synchronization enforced',
    owner: 'Rajesh Iyer (CISO)',
    escalation: 'Karthik Nair (SecOps) → CISO → CRO',
  },
  {
    regulator: 'PFRDA',
    thresholds: [
      'Subscriber-impacting incident intimation within 48 hours',
      'Quarterly ICS compliance return',
      'Annual cyber-security audit within 30 days of FY close',
    ],
    retention: '10-year pension record-keeping',
    owner: 'Anjali Deshmukh (Head of Compliance)',
    escalation: 'Compliance → CRO → Board Risk Committee',
  },
  {
    regulator: 'DPDP Board',
    thresholds: ['Personal-data-breach intimation ~72 hours (confirm against notified DPDP Rules)'],
    retention: 'DPDP one-year minimum log retention',
    owner: 'Priya Sharma (DPO)',
    escalation: 'DPO → Head of Compliance → CRO',
    note: 'Window pending final notified Rules — configured conservatively at 72 hours.',
  },
]

// ── Maker-checker / workflow policy ─────────────────────────────────────────
export interface McRow {
  object: string
  required: boolean
  approver: string
  sla: string
}

export const MC_ROWS: McRow[] = [
  { object: 'Obligations & regulatory filings', required: true, approver: 'Head of Compliance', sla: '24h before due' },
  { object: 'Policy changes', required: true, approver: 'CRO', sla: '5 business days' },
  { object: 'Control re-tests (manual)', required: true, approver: 'Control owner (2nd line)', sla: '3 business days' },
  { object: 'Incident regulator submissions', required: true, approver: 'CISO', sla: 'Within clock window' },
  { object: 'Risk acceptance', required: true, approver: 'CRO', sla: '7 business days' },
  { object: 'DSAR erasure decisions', required: true, approver: 'DPO + Head of Compliance', sla: 'Within DPDP window' },
  { object: 'Bulk issue closure', required: false, approver: 'Internal Audit (sample check)', sla: 'Post-hoc' },
]

// ── Integrations summary (mirrors /integrations) ────────────────────────────
export interface IntegrationRow {
  name: string
  detail: string
  status: 'Live' | 'Synced' | 'Connected'
  syncMins: number
}

export const INTEGRATIONS: IntegrationRow[] = [
  { name: 'Sankalp ServiceDesk', detail: 'In-house ITSM + CMDB · integrated, not replaced', status: 'Live', syncMins: 2 },
  { name: 'Splunk SIEM', detail: 'Security events & logs', status: 'Live', syncMins: 1 },
  { name: 'Qualys / Tenable', detail: 'Vulnerability scanner', status: 'Synced', syncMins: 47 },
  { name: 'CrowdStrike EDR', detail: 'Endpoint detection', status: 'Live', syncMins: 3 },
  { name: 'Okta / AD', detail: 'Identity & access', status: 'Synced', syncMins: 12 },
  { name: 'AWS Security Hub', detail: 'CCM cloud feed', status: 'Live', syncMins: 8 },
  { name: 'OneTrust', detail: 'DPDP / consent & discovery', status: 'Synced', syncMins: 37 },
  { name: 'TeamLease RegTech', detail: 'Obligation engine', status: 'Synced', syncMins: 64 },
  { name: 'Lexplosion Komrisk', detail: 'Regulatory change feed', status: 'Synced', syncMins: 88 },
  { name: 'ClearTax / IRIS GST', detail: 'GST filing', status: 'Connected', syncMins: 126 },
  { name: 'NPS Trust + CRA', detail: 'Protean / KFintech', status: 'Synced', syncMins: 19 },
]

// ── Retention & privacy policy cards ────────────────────────────────────────
export const RETENTION_CARDS = [
  { title: 'CERT-In security logs', rule: '180-day in-India retention floor', basis: 'CERT-In Direction 20(3)/2022', note: 'Splunk SIEM & EDR feeds stored in-region; NTP-synced timestamps.' },
  { title: 'DPDP logs', rule: '1-year minimum log retention', basis: 'DPDP Act 2023 / Rules 2025', note: 'Access and processing logs over subscriber personal data.' },
  { title: 'PFRDA pension records', rule: '10-year record-keeping', basis: 'PFRDA ICS Guidelines 2024', note: 'PRAN, contributions and NAV history retained post-exit.' },
  { title: 'Accounting & secretarial', rule: '8-year retention', basis: 'Companies Act 2013', note: 'Books of account, board minutes and statutory registers.' },
  { title: 'PII handling', rule: 'Masked at rest & in display', basis: 'DPDP + internal policy', note: 'PRAN shown masked (1100 7845 ••••); no raw subscriber PII surfaced in the platform.' },
]

// ── Notification preferences (per event × channel) ──────────────────────────
export interface NotifPref {
  event: string
  inApp: boolean
  email: boolean
}

export const DEFAULT_NOTIFS: NotifPref[] = [
  { event: 'Incident on a regulator clock', inApp: true, email: true },
  { event: 'Obligation due / overdue', inApp: true, email: true },
  { event: 'Control auto-fail (CCM)', inApp: true, email: true },
  { event: 'Regulatory change ingested', inApp: true, email: false },
  { event: 'DSAR filed / due', inApp: true, email: false },
  { event: 'Audit finding raised', inApp: true, email: false },
]

// ── Audit log (system activity) — references real entity ids ────────────────
export interface AuditLogRow {
  id: string
  at: string
  actor: string // person id
  action: string
  object: string // entity id
  detail: string
}

export function buildAuditLog(): AuditLogRow[] {
  const overdueObl = WORLD.obligations.find((o) => o.status === 'Overdue')?.id ?? WORLD.obligations[0].id
  const gstObl = WORLD.obligations.find((o) => o.regulator === 'GST')?.id ?? WORLD.obligations[0].id
  const pfrdaObl = WORLD.obligations.find((o) => o.regulator === 'PFRDA')?.id ?? WORLD.obligations[0].id
  const ccmCtrl = WORLD.controls.find((c) => c.automation === 'CCM' && c.result === 'Fail')?.id ?? 'CTRL-ISO-A.8.5'
  const mfaCtrl = 'CTRL-ISO-A.8.5'
  const ev = WORLD.evidence[0].id

  const rows: Omit<AuditLogRow, 'id' | 'at'>[] = [
    { actor: 'rajesh', action: 'Signed off CERT-In Annexure I', object: 'INC-2026-0411', detail: 'Incident report prepared for 6-hour submission' },
    { actor: 'neha', action: 'Escalated incident to Critical', object: 'INC-2026-0411', detail: 'Three regulator clocks started' },
    { actor: 'karthik', action: 'CCM rule re-run', object: ccmCtrl, detail: '3 critical vulns past 14-day SLA — issue spawned' },
    { actor: 'anjali', action: 'Approved filing (maker-checker)', object: pfrdaObl, detail: 'Quarterly PFRDA compliance return' },
    { actor: 'deepa', action: 'Moved to In review', object: gstObl, detail: 'GSTR-3B impacted by reg-change RCM-2026-118' },
    { actor: 'priya', action: 'Placed DSAR on hold', object: 'DSAR-2026-0047', detail: 'Erasure withheld — PFRDA retention override' },
    { actor: 'anjali', action: 'Acknowledged regulatory change', object: 'RCM-2026-118', detail: 'GSTR-3B Table 4 format revision' },
    { actor: 'arvind', action: 'Assessed circular impact', object: 'RCM-2026-117', detail: 'Scheme E exposure caps tightened' },
    { actor: 'priya', action: 'Published policy v3.2', object: 'POL-010', detail: 'Data Privacy (DPDP) Policy — 7 controls mapped' },
    { actor: 'lakshmi', action: 'Raised audit finding', object: 'AUD-INT-2026-03', detail: 'Privileged access recertification overdue' },
    { actor: 'rohan', action: 'Uploaded attestation', object: ev, detail: 'Backup restoration test evidence' },
    { actor: 'meera', action: 'Approved risk treatment', object: WORLD.risks[0].id, detail: 'Top-5 residual risk plan endorsed' },
    { actor: 'karthik', action: 'Contained incident', object: 'INC-2026-0405', detail: 'Phishing campaign — CERT-In report filed' },
    { actor: 'sunita', action: 'Verified issue closure', object: WORLD.issues.find((i) => i.status === 'Resolved')?.id ?? WORLD.issues[0].id, detail: 'Remediation evidence sampled' },
    { actor: 'farhan', action: 'Filed PF & ESI challan', object: WORLD.obligations.find((o) => o.regulator === 'Labour')?.id ?? overdueObl, detail: 'Filing acknowledgement captured' },
    { actor: 'rajesh', action: 'Re-tested control', object: mfaCtrl, detail: 'MFA enforced on privileged access — Pass' },
    { actor: 'imran', action: 'Updated vendor risk', object: WORLD.risks.find((r) => r.domain === 'ThirdParty')?.id ?? WORLD.risks[1].id, detail: 'CRA services SLA review' },
    { actor: 'vikram', action: 'Finalised board minutes', object: WORLD.obligations.find((o) => o.regulator === 'Companies Act')?.id ?? overdueObl, detail: 'Q1 board meeting' },
    { actor: 'sanjay', action: 'Flagged exposure breach', object: WORLD.risks.find((r) => r.domain === 'Investment')?.id ?? WORLD.risks[2].id, detail: 'Single-issuer concentration' },
    { actor: 'meera', action: 'Exported board pack', object: 'INC-2026-0411', detail: 'Board risk & compliance pack' },
    { actor: 'priya', action: 'Reconciled consent ledger', object: WORLD.dataAssets[0].id, detail: 'OneTrust discovery sync' },
    { actor: 'rohan', action: 'Closed issue', object: WORLD.issues[2].id, detail: 'Config drift remediated' },
  ]

  // stamp descending real timestamps from ~6 min ago, spreading back over ~2 days
  return rows.map((r, i) => ({
    ...r,
    id: `LOG-${String(i + 1).padStart(3, '0')}`,
    at: minsFromNow(-(6 + i * 127 + (i % 3) * 19)),
  }))
}

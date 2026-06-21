// OneGRC — entity type definitions (A6). All entities cross-link by id.

export type Framework = 'ISO 27001' | 'NIST CSF' | 'PCI DSS' | 'PFRDA ICS'
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
export type RiskDomain =
  | 'IT'
  | 'Cyber'
  | 'Operational'
  | 'Investment'
  | 'Compliance'
  | 'ThirdParty'
export type Regulator =
  | 'PFRDA'
  | 'CERT-In'
  | 'DPDP'
  | 'GST'
  | 'Labour'
  | 'Companies Act'

export type LineOfDefence = '1LoD' | '2LoD' | '3LoD'

// ── Provenance (Epic 1 — Source and Provenance; normalized in Epic 15) ───────
// THE single source model, normalized into a parent SourceInstrument (the legal
// instrument — Act / Rules / Circular / Standard) and provision-level
// SourceProvision children (the exact section / rule / clause). Held inline so a
// future document repository slots behind the same types. Reused by Obligation,
// Policy, Control framework mappings, future penalty/consequence tiers and the
// future Compliance Intake record (Epic 14). There is deliberately no second
// source model anywhere.
export type InstrumentType =
  | 'Act'
  | 'Rules'
  | 'Regulation'
  | 'Master Circular'
  | 'Notification'
  | 'Direction'
  | 'Standard'
  | 'Circular'

// Where the instrument was sourced from.
export type SourceChannel =
  | 'Regulator site'
  | 'Official Gazette'
  | 'Content feed'
  | 'Manual upload'

export type InstrumentStatus = 'In force' | 'Superseded' | 'Draft' | 'Repealed'

// The session-held artifact behind an instrument (a future repository slots
// behind this). file pickers are mocked (A10) — "replace with newer version"
// is a toast.
export interface AttachedDocument {
  filename: string // 'PFRDA-MC-Investment-Guidelines-10Dec2025.pdf'
  label: string // 'Master Circular (PDF)'
  capturedAt: string // ISO — when the artifact was attached this session
  sizeLabel: string // '412 KB' (non-round, A4)
}

// Parent — the legal instrument. Instrument-level fields live here once.
export interface SourceInstrument {
  id: string // 'INST-EPF-1952'
  title: string // 'Employees’ Provident Funds & Miscellaneous Provisions Act, 1952'
  authority: string // issuing authority, e.g. 'EPFO' | 'MCA' | 'PFRDA' | 'CBIC' | 'ISO'
  regulator?: Regulator // mapped Regulator where one applies
  instrumentType: InstrumentType
  referenceNumber?: string // circular / notification number, only where genuinely known
  dateOfIssue: string // ISO
  effectiveDate?: string // ISO — distinct from any due date
  version?: string // 'v2025.12' / '2022 edition'
  supersedesId?: string // the prior SourceInstrument this replaces
  supersededById?: string // reverse link — set on the older instrument
  sourceChannel: SourceChannel
  sourceLink: string // URL
  attachedDocument?: AttachedDocument
  status: InstrumentStatus
  intake?: IntakeMeta // Compliance Intake (Epic 14) — inflow metadata, when this arrived via intake
}

// ── Compliance Intake (Epic 14 — inflow only; reuses the Epic 15 model) ──────
// An incoming circular is parsed into a SourceInstrument + its SourceProvisions;
// intake adds ONLY the inflow metadata. No separate record model.
export type IntakeChannel = 'Auto-pull' | 'Manual upload'

// The triage lifecycle: Pulled/Uploaded → Parsed → Under triage → one of
// {Accepted, Needs internal review, Needs external specialist, Parked} → Live.
export type TriageState =
  | 'Pulled'
  | 'Uploaded'
  | 'Parsed'
  | 'Under triage'
  | 'Accepted'
  | 'Needs internal review'
  | 'Needs external specialist'
  | 'Parked'
  | 'Live'

export interface IntakeMeta {
  channel: IntakeChannel
  receivedAt: string // ISO
  parse: AgentAction // the regulatory-change agent's parse (provenance + confidence)
  triageState: TriageState
  parkedReason?: string
}

// A scripted, deterministic action from an agent (here, the ingestion agent).
// Carries provenance + confidence; never a model API call. The minimal Epic 7
// slice — the fuller agentic workflow comes later.
export interface AgentAction {
  agent: string // 'Ingestion Agent'
  recommendation: string // the proposed outcome, plain English
  confidence: number // 0–100 (non-round, A4)
  at: string // ISO — when the agent produced it
  basis: string // provenance — what the recommendation was derived from
}

// One penalty/consequence tier of a provision, each sourced. Its severity feeds
// the deterministic severity-from-penalty (the minimal Epic 4 slice).
export interface PenaltyTier {
  trigger: string // 'Late filing of the annual return'
  consequence: string // '₹100 per day, max ₹2,00,000'
  severity: Severity // gravity of this tier
  sourceRef: string // SourceProvision id stating this penalty
}

// The per-provision review lifecycle (Story 15.6): the ingestion recommends,
// Compliance reviews, then it is approved-and-tracked, routed for internal
// review, or sent to a specialist.
export type ReviewState =
  | 'Recommended'
  | 'Under review'
  | 'Approved and saved'
  | 'Needs internal review'
  | 'Needs specialist'

// Child — a section/clause of one instrument (the renamed, enriched Epic 1
// SourceReference). Owns the per-section structured compliance fields and the
// review-to-track lifecycle. One model, reused by Epic 14 intake.
export interface SourceProvision {
  id: string // 'SRC-EPF-14B' — keeps the SRC- prefix; cited by obligations/policies/controls
  instrumentId: string // parent SourceInstrument
  provision: string // PINNED — the exact section, rule, clause or paragraph
  title: string // short provision title, e.g. 'Section 14B — Damages for default'
  citation: string // formal full citation line
  sourceExtract: string // short real excerpt of the cited provision
  sourceLink?: string // optional per-provision deep link (else the instrument's)
  attachedDocument?: AttachedDocument // optional per provision
  // Structured compliance fields (set on statutory provisions; absent on pure
  // framework-standard references).
  nameOfCompliance?: string // 'PF contribution — damages on default'
  briefDescription?: string // one-line plain-English description
  keyParts?: string[] // the key obligations/parts of the section
  penaltyTiers?: PenaltyTier[] // consequence tiers, each sourced
  severity?: Severity // derived from the penalty tiers (severity-from-penalty)
  frequency?: string // 'Monthly' | 'Quarterly' | 'Annual' | 'Event-based'
  nextDue?: string // ISO — next due date of the return, where applicable
  // Ingestion recommendation + review record (the maker-checker over the AI).
  aiRecommendation?: AgentAction
  recommendedObligationIds: string[] // obligations the ingestion mapped here (filled in world.ts)
  reviewState?: ReviewState
  reviewer?: string // person id (the checker — Compliance / Company Secretary)
  reviewedAt?: string // ISO
  rationale?: string // the reviewer's reason
  // On approval (Save to controls) — the tracked records this section produced.
  linkedObligationId?: string
  linkedControlId?: string
}

export interface Person {
  id: string
  name: string
  title: string
  role: RoleKey
  initials: string
  lod: LineOfDefence
  email: string
}

export type RoleKey =
  | 'CRO'
  | 'CISO'
  | 'COMPLIANCE'
  | 'COSEC'
  | 'AUDIT'
  | 'INVCOMP'

export interface Risk {
  id: string
  title: string
  domain: RiskDomain
  owner: string // person id
  likelihood: number // 1-5
  impact: number // 1-5
  inherent: number // 1-25
  residual: number // 1-25
  treatment: 'Mitigate' | 'Accept' | 'Transfer' | 'Avoid'
  linkedControls: string[]
  linkedIncidents: string[]
  linkedIssues: string[]
  status: 'Open' | 'Monitoring' | 'Mitigated' | 'Accepted'
  trend: 'up' | 'down' | 'flat'
  lastReviewed: string // ISO
  description: string
}

export interface Control {
  id: string
  title: string
  frameworks: Framework[]
  mappedFrameworkRefs: { framework: Framework; ref: string; sourceRef?: string }[]
  owner: string
  type: 'Preventive' | 'Detective'
  automation: 'CCM' | 'Manual'
  lastTested: string // ISO
  result: 'Pass' | 'Fail' | 'Partial'
  evidenceCount: number
  linkedRisks: string[]
  linkedIssues: string[]
  ccmRuleId?: string
  description: string
  frequency: string
  sourceRefs?: string[] // SourceProvision ids — provenance for this control
}

export interface Obligation {
  id: string
  regulator: Regulator
  title: string
  frequency: string
  dueDate: string // ISO
  owner: string
  status: 'Filed' | 'Due' | 'Overdue' | 'In review'
  makerChecker: { maker: string; checker: string; state: 'Drafted' | 'Submitted' | 'Approved' | 'Pending' }
  evidence: string[]
  linkedRegChange?: string
  reference: string
  sourceRefs?: string[] // SourceProvision ids — the instrument(s) this obligation derives from
  requirement?: string // plain-English outcome the provision imposes — shown as "What this requires"
  applicability?: string // whether/why it applies to SPF + the basis — shown as "Applies because"
}

export interface RegulatorTrack {
  regulator: Regulator | 'DPDP Board'
  clockLabel: string
  windowHours: number
  deadline: string // ISO
  clockStartedAt: string // ISO
  status: 'On track' | 'At risk' | 'Breached' | 'Filed'
  output: string // the artefact to produce
}

export interface TimelineEvent {
  at: string // ISO
  actor: string // person id or system
  channel: 'Splunk SIEM' | 'CrowdStrike EDR' | 'Sankalp ServiceDesk' | 'OneGRC' | 'CERT-In' | 'PFRDA' | 'DPDP'
  text: string
  kind: 'detect' | 'triage' | 'contain' | 'notify' | 'evidence' | 'note'
}

export interface Incident {
  id: string
  title: string
  classification: Severity
  detectedAt: string // ISO
  source: 'Sankalp ServiceDesk (ITSM)' | 'Splunk SIEM' | 'CrowdStrike EDR' | 'Qualys VM' | 'OneTrust'
  assets: string[]
  owner: string
  status: 'Open' | 'Contained' | 'Eradicated' | 'Closed'
  regulatorTracks: RegulatorTrack[]
  timeline: TimelineEvent[]
  subscriberImpacting: boolean
  personalDataInvolved: boolean
  linkedRisks: string[]
  linkedControls: string[]
  linkedIssues: string[]
  evidence: string[]
  summary: string
}

export interface Policy {
  id: string
  title: string
  version: string
  owner: string
  approvedBy: string
  approvedOn: string
  nextReview: string
  mappedControls: string[]
  status: 'Published' | 'In review' | 'Draft'
  category: string
  sourceRefs?: string[] // SourceProvision ids — the instrument(s) this policy derives from
}

export interface Issue {
  id: string
  title: string
  source: 'Control failure' | 'Audit finding' | 'Incident'
  sourceRef: string
  severity: Severity
  owner: string
  dueDate: string
  ageDays: number
  status: 'Open' | 'In progress' | 'Overdue' | 'Resolved'
  linkedControls: string[]
}

export interface Evidence {
  id: string
  title: string
  type: 'Screenshot' | 'Log' | 'Config export' | 'Attestation' | 'Filing ack'
  capturedAt: string
  capturedBy: string // 'CCM (auto)' | person id
  auto: boolean
  linkedControls: string[]
  linkedObligations: string[]
  frameworkRefs: Framework[]
  source: string
}

export interface AuditFinding {
  id: string
  title: string
  severity: Severity
  status: 'Open' | 'Remediation' | 'Closed'
  linkedIssue?: string
}

export interface Audit {
  id: string
  title: string
  type: 'IS audit (CERT-In empanelled)' | 'Internal' | 'PFRDA'
  auditor: string
  period: string
  status: 'Planned' | 'Fieldwork' | 'Reporting' | 'Closed'
  findings: AuditFinding[]
  scope: string
}

export interface RegulatoryChange {
  id: string
  source: 'TeamLease RegTech' | 'Lexplosion Komrisk' | 'PFRDA circular'
  summary: string
  regulator: Regulator
  publishedAt: string
  impactedObligations: string[]
  impactedControls: string[]
  owner: string
  status: 'Assessed' | 'In progress' | 'Closed'
  detail: string
}

export interface DataAsset {
  id: string
  name: string
  store: 'CRA' | 'KYC DB' | 'Fund Accounting' | 'CRM'
  piiTypes: ('PRAN' | 'KYC' | 'Nominee' | 'Bank' | 'Financial')[]
  classification: 'Restricted' | 'Confidential' | 'Internal'
  retentionRule: string
  consentStatus: 'Captured' | 'Partial' | 'Legacy'
  records: number
}

export interface Dsar {
  id: string
  pran: string // masked
  type: 'Access' | 'Erasure' | 'Correction' | 'Nomination'
  raisedAt: string
  dueDate: string
  status: 'Open' | 'In review' | 'Fulfilled' | 'On hold'
  owner: string
  note: string
}

export interface ActivityItem {
  id: string
  at: string // ISO
  actor: string
  kind:
    | 'ccm-fail'
    | 'ccm-pass'
    | 'reg-change'
    | 'evidence'
    | 'dsar'
    | 'incident'
    | 'obligation'
    | 'approval'
    | 'audit'
    | 'policy'
  text: string
  ref: string // entity id
  route: string
}

export interface QueueTask {
  id: string
  role: RoleKey
  kind: 'Approval' | 'Control re-test' | 'Incident action' | 'DSAR' | 'Evidence request' | 'Reg-change review'
  title: string
  ref: string
  route: string
  due: string
  priority: Severity
}

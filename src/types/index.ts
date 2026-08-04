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

// The department dimension (enhancement plan 1.1). A department is derived from
// the owner's function; every obligation, control, policy, task and approval
// takes its department from whoever owns it. The set is fixed; every department
// has at least one named owner. Compliance and the administrator keep the
// all-departments view; a department user sees only their own department.
export type Department =
  | 'Compliance and Company Secretarial'
  | 'Risk'
  | 'IT and Information Security'
  | 'Investment Compliance'
  | 'Data Protection'
  | 'Finance and Tax'
  | 'HR and Labour'
  | 'Internal Audit'

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

// The session-held artifact behind an instrument (a document repository slots
// behind this) — e.g. "replace with newer version".
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
  // Act-level overview shown at the top of the act detail (Sources pipeline).
  summary?: string // plain "what this act covers"
  applicability?: string // plain "how it affects SPF" — the applicability overview
  departments?: Department[] // explicit routing for AI-created acts (E0.6 / 1.6); seed acts derive from owners
  createdInSession?: boolean // minted via the in-app Create Source Act flow
}

// A scripted, deterministic action from an agent (here, the ingestion agent).
// Carries provenance + confidence; never a model API call. The applicability
// recommendation slice — the fuller agentic workflow comes later.
export interface AgentAction {
  agent: string // 'Ingestion Agent'
  recommendation: string // the proposed outcome, plain English
  confidence: number // 0–100 (non-round, A4)
  at: string // ISO — when the agent produced it
  basis: string // provenance — what the recommendation was derived from
}

// One penalty/consequence tier of a clause, each sourced. Its severity feeds
// the deterministic severity-from-penalty.
export interface PenaltyTier {
  trigger: string // 'Late filing of the annual return'
  consequence: string // '₹100 per day, max ₹2,00,000'
  severity: Severity // gravity of this tier
  sourceRef: string // SourceProvision id stating this penalty
}

// The clause pipeline status (Sources pipeline): a new clause is Processing /
// Recommended, then it is Saved (mapped to a control and tracked), sent to a
// specialist, or marked Not applicable.
export type ClauseStatus =
  | 'Processing'
  | 'Recommended'
  | 'Saved'
  | 'Specialist review'
  | 'Not applicable'

// Child — a clause/section of one instrument (act). Owns the per-clause
// structured compliance fields and the act → clause → control pipeline.
export interface SourceProvision {
  id: string // 'SRC-EPF-14B' — keeps the SRC- prefix; cited by obligations/policies/controls
  instrumentId: string // parent SourceInstrument
  provision: string // PINNED — the exact section, rule, clause or paragraph
  title: string // short clause title, e.g. 'Section 14B — Damages for default'
  citation: string // formal full citation line
  sourceExtract: string // short real excerpt of the cited clause
  sourceLink?: string // optional per-clause deep link (else the instrument's)
  attachedDocument?: AttachedDocument // optional per clause
  // Structured compliance fields (set on statutory clauses; absent on pure
  // framework-standard references).
  nameOfCompliance?: string // 'PF contribution — damages on default'
  briefDescription?: string // one-line description
  whatItMeans?: string // plain-English explanation of what the clause requires in practice
  keyParts?: string[] // the key obligations/parts of the clause
  penaltyTiers?: PenaltyTier[] // consequence tiers, each sourced
  severity?: Severity // derived from the penalty tiers (severity-from-penalty)
  frequency?: string // 'Monthly' | 'Quarterly' | 'Annual' | 'Event-based'
  nextDue?: string // ISO — next due date, where applicable
  // Applicability to SPF + the scripted recommendation (no model call).
  applicable?: boolean // applicable / not applicable to SPF
  applicabilityBasis?: string // why it applies (or not)
  aiRecommendation?: AgentAction
  // The act → clause → control pipeline.
  status?: ClauseStatus
  reviewer?: string // person id (Compliance / Company Secretary) who acted
  reviewedAt?: string // ISO
  rationale?: string // the reviewer's reason
  specialistNote?: string // specialist outcome (what to implement), set on completion
  linkedControlId?: string // the control this clause is saved to (Save → Control Library)
}

export interface Person {
  id: string
  name: string
  title: string
  role: RoleKey
  initials: string
  lod: LineOfDefence
  email: string
  department: Department // the function this person belongs to (1.1)
}

// The 7 functional personas the app is organised around. The switcher selects a
// persona; each is backed by a representative roster person (see data/people.ts).
export type RoleKey =
  | 'EXEC' // Executive (board roll-up + exceptions)
  | 'RISK' // Risk Manager (register, heat map, treatment)
  | 'CCO' // Compliance Manager (obligations, approvals, clause decisions)
  | 'ANALYST' // Compliance Analyst (first-line filings + clause-pipeline work)
  | 'CTRLOWNER' // Control Owner (controls, tests, CCM, evidence)
  | 'AUDITOR' // Auditor (audits, findings, remediation, evidence trail)
  | 'ADMIN' // Administrator (org/users/roles/config, audit log)

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
  description: string // the control activity — what must be done
  frequency: string // the cadence
  nextDue?: string // ISO — the "by when", for tracked compliance controls
  sourceRefs?: string[] // SourceProvision ids — provenance for this control
}

// One action that must be taken to satisfy an obligation (enhancement plan 3 /
// functional spec 5.4). A deduction-type duty (PF / PT / TDS) is a sequence:
// deduct -> pay -> file the return. Each sub-step is its own mini-task with a
// maker, a checker, a due date and the evidence that proves it — and different
// departments can own different steps (e.g. HR & Labour deducts, Finance pays).
export interface ObligationSubStep {
  id: string // 'OBL-LAB-JUN26-04-S1'
  seq: number // 1-based order
  title: string // 'Deduct profession tax from payroll (Schedule I)'
  clauseRef?: string // SourceProvision id this action discharges (e.g. SRC-PT-4)
  maker: string // person id who performs the action
  checker: string // person id who verifies it (two-step maker-checker)
  dueDate: string // ISO — the by-when for this step
  status: 'Done' | 'Pending' | 'Overdue'
  evidenceId?: string // the proof, once done (kept for audit)
  dependsOnSeq?: number // prerequisite step (sequential); absent = may run in parallel
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
  origin?: 'External' | 'Internal' // External = statutory/regulator; Internal = policy-driven duty the firm set itself
  policySource?: string // for internal duties: the policy that mandates it (shown instead of a regulator)
  subSteps?: ObligationSubStep[] // ordered actions to satisfy a multi-step (deduction-type) duty
  filedAt?: string // ISO — when a Filed cycle was actually filed (for on-time vs late, E2.3)
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
  source: 'Sankalp ServiceDesk (ITSM)' | 'Splunk SIEM' | 'CrowdStrike EDR' | 'Qualys VM' | 'Consent & Privacy platform'
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
  source: 'Regulatory Intelligence feed' | 'PFRDA circular'
  summary: string
  regulator: Regulator
  publishedAt: string
  impactedObligations: string[]
  impactedControls: string[]
  owner: string
  status: 'Assessed' | 'In progress' | 'Closed'
  detail: string
  instrumentId?: string // set when registered against an existing instrument (a new circular/version)
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
  step: number // completed steps in the locate→retain→erase→log→audit workflow (5.9)
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

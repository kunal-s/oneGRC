import type {
  Risk,
  Control,
  Obligation,
  ObligationSubStep,
  Incident,
  Policy,
  Issue,
  Evidence,
  Audit,
  AuditFinding,
  RegulatoryChange,
  DataAsset,
  Dsar,
  ActivityItem,
  QueueTask,
  Framework,
  RiskDomain,
  Regulator,
  Severity,
  RegulatorTrack,
  TimelineEvent,
  RoleKey,
} from '@/types'
import { Rand } from './rng'
import { ISO_REFS, NIST_REFS, PCI_REFS, PFRDA_REFS, type Ref } from './refs'
import { PEOPLE } from './people'
import { SOURCES, INSTRUMENTS, sourceForRegulator, sourceForFramework } from './sources'
import { NOW_MS, MARQUEE_DETECTED_MS, minsFromNow, daysFromNow, ist } from '@/lib/time'

const iso = (d: Date) => d.toISOString()

// ── shared named-value pools ────────────────────────────────────────────────
const NPS_SCHEMES = ['Scheme E', 'Scheme C', 'Scheme G', 'Scheme A']
const TIERS = ['Tier I', 'Tier II']
const FA_ASSETS = [
  'SPF-FA-DB-02 (Fund Accounting DB)',
  'SPF-FA-APP-01',
  'SPF-CRA-IF-03 (CRA interface)',
  'SPF-NAV-ENGINE-01',
  'SPF-KYC-DB-01',
  'SPF-WEB-EDGE-02',
  'SPF-AD-DC-01',
  'SPF-BKP-VAULT-01',
  'SPF-SOC-SIEM-01',
  'SPF-CRM-APP-04',
]
const FRAMEWORKS: Framework[] = ['ISO 27001', 'NIST CSF', 'PCI DSS', 'PFRDA ICS']

const CISO_TEAM = ['rajesh', 'karthik', 'rohan', 'neha']
const COMPLIANCE_TEAM = ['anjali', 'priya', 'deepa', 'farhan']
const INV_TEAM = ['arvind', 'sanjay', 'imran']

function ownerForFramework(r: Rand, primary: Framework): string {
  if (primary === 'PFRDA ICS') return r.pick([...INV_TEAM, 'anjali', 'meera'])
  return r.pick(CISO_TEAM)
}

// ── Controls (260; each maps to 2–4 frameworks; 38 CCM-automated) ────────────
function refToId(primary: Framework, ref: string): string {
  const prefix =
    primary === 'ISO 27001'
      ? 'ISO'
      : primary === 'NIST CSF'
        ? 'NIST'
        : primary === 'PCI DSS'
          ? 'PCI'
          : 'PFRDA-ICS'
  return `CTRL-${prefix}-${ref}`
}

const POOL: Record<Framework, Ref[]> = {
  'ISO 27001': ISO_REFS,
  'NIST CSF': NIST_REFS,
  'PCI DSS': PCI_REFS,
  'PFRDA ICS': PFRDA_REFS,
}

function buildControls(): Control[] {
  const r = new Rand(7001)
  const controls: Control[] = []
  // primary allocation: ISO 93, NIST 60, PCI 47, PFRDA 60 = 260
  // allocations match curated pool sizes exactly → unique primary ids; total 260
  const plan: [Framework, number][] = [
    ['ISO 27001', 93],
    ['NIST CSF', 59],
    ['PCI DSS', 44],
    ['PFRDA ICS', 64],
  ]
  // result distribution enforced: 10 Fail, 30 Partial, 220 Pass → coverage 96.2%
  const results: Control['result'][] = []
  for (let i = 0; i < 220; i++) results.push('Pass')
  for (let i = 0; i < 30; i++) results.push('Partial')
  for (let i = 0; i < 10; i++) results.push('Fail')
  // deterministic shuffle
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1))
    ;[results[i], results[j]] = [results[j], results[i]]
  }

  let idx = 0
  for (const [primary, count] of plan) {
    const pool = POOL[primary]
    for (let i = 0; i < count; i++) {
      const ref = pool[i % pool.length]
      const id = refToId(primary, ref.ref)
      // map once → satisfy many: 2-4 frameworks incl. primary
      const others = FRAMEWORKS.filter((f) => f !== primary)
      const extra = r.sample(others, r.int(1, 3))
      const frameworks: Framework[] = [primary, ...extra]
      const mappedFrameworkRefs = frameworks.map((f) => {
        if (f === primary) return { framework: f, ref: ref.ref }
        const op = POOL[f]
        return { framework: f, ref: r.pick(op).ref }
      })
      const automation: Control['automation'] = controls.length < 0 ? 'CCM' : 'Manual'
      const type: Control['type'] = /log|monitor|detect|scan|alert|siem|review|audit trail/i.test(
        ref.title,
      )
        ? 'Detective'
        : 'Preventive'
      controls.push({
        id,
        title: ref.title,
        frameworks,
        mappedFrameworkRefs,
        owner: ownerForFramework(r, primary),
        type,
        automation,
        lastTested: iso(new Date(NOW_MS - r.int(1, 120) * 86400000)),
        result: results[idx],
        evidenceCount: r.int(2, 24),
        linkedRisks: [],
        linkedIssues: [],
        description: `${ref.title}. Operated for SPF ${r.pick(['CRA interface', 'Fund Accounting', 'subscriber web', 'corporate IT', 'cloud workloads'])} scope; mapped across ${frameworks.length} frameworks under the unified control taxonomy.`,
        frequency: r.pick(['Continuous', 'Daily', 'Weekly', 'Monthly', 'Quarterly']),
      })
      idx++
    }
  }

  // Designate 38 CCM-automated controls (detective/monitoring leaning)
  const ccmCandidates = controls
    .map((c, i) => ({ c, i }))
    .filter(({ c }) =>
      /log|monitor|patch|vulnerab|backup|clock|malware|configuration|mfa|authentication|access|encrypt/i.test(
        c.title,
      ),
    )
  const chosen = r.sample(ccmCandidates, 38)
  for (const { c } of chosen) {
    c.automation = 'CCM'
    c.ccmRuleId = c.id.replace('CTRL-', 'CCM-')
  }

  // Guarantee the marquee CCM rule ("patch ≤14 days") is CCM + currently FAILING,
  // while preserving exactly 10 Fail (coverage 96.2%): swap a non-CCM Fail to Pass.
  const patchCtrl =
    chosen.map((x) => x.c).find((c) => /patch|vulnerab/i.test(c.title)) ?? chosen[0].c
  if (patchCtrl.result !== 'Fail') {
    const compensator = controls.find((c) => c.result === 'Fail' && c.automation !== 'CCM' && c.id !== patchCtrl.id)
    if (compensator) {
      compensator.result = 'Pass' // keep Fail count at exactly 10 → coverage 96.2%
      patchCtrl.result = 'Fail'
    }
  }
  return controls
}

// ── Risks (140) ─────────────────────────────────────────────────────────────
const RISK_TITLES: Record<RiskDomain, string[]> = {
  IT: [
    'Unpatched critical vulnerabilities on internet-facing assets',
    'Privileged access sprawl across CRA interfaces',
    'Legacy fund-accounting platform end-of-support',
    'Inadequate network segmentation between corporate IT and CDE',
    'Backup restoration not regularly tested',
    'Shadow IT and unsanctioned SaaS usage',
    'Misconfigured cloud storage exposing logs',
    'Insufficient logging on the NAV engine',
  ],
  Cyber: [
    'Ransomware impacting fund-accounting servers',
    'Phishing leading to credential compromise',
    'Data exfiltration of subscriber PII',
    'DDoS against the subscriber web portal',
    'Supply-chain compromise via CRA integration',
    'Insider misuse of privileged access',
    'Weak MFA coverage on remote access',
  ],
  Operational: [
    'NAV calculation error across schemes',
    'Failed subscriber contribution reconciliation',
    'Key-person dependency in investment operations',
    'Manual evidence collection delays audit',
    'Business continuity gap at primary data centre',
    'Delay in periodical PFRDA returns',
    'Inaccurate nominee data in CRA',
  ],
  Investment: [
    'Breach of scheme-wise exposure limits',
    'Concentration risk in a single issuer',
    'Liquidity mismatch in Scheme G',
    'Mark-to-market valuation breach',
    'Derivatives exposure beyond mandate',
    'Credit-rating downgrade of held securities',
  ],
  Compliance: [
    'Non-filing of GSTR-3B within due date',
    'DPDP consent gaps for legacy subscribers',
    'CERT-In 6-hour reporting capability gap',
    'Companies Act committee cadence slippage',
    'Labour code compliance across branches',
    'Regulatory change not assessed in time',
  ],
  ThirdParty: [
    'Vendor SLA breach on CRA services',
    'Fourth-party concentration in cloud hosting',
    'Inadequate due diligence on new vendors',
    'Sub-processor change without notification',
    'Vendor security posture degradation',
  ],
}
const DOMAIN_PREFIX: Record<RiskDomain, string> = {
  IT: 'IT',
  Cyber: 'CYB',
  Operational: 'OPS',
  Investment: 'INV',
  Compliance: 'CMP',
  ThirdParty: 'TPR',
}

function buildRisks(controls: Control[]): Risk[] {
  const r = new Rand(1401)
  const domains: RiskDomain[] = ['IT', 'Cyber', 'Operational', 'Investment', 'Compliance', 'ThirdParty']
  const risks: Risk[] = []
  const counts: Record<RiskDomain, number> = {
    IT: 30,
    Cyber: 26,
    Operational: 28,
    Investment: 22,
    Compliance: 20,
    ThirdParty: 14,
  }
  const seqByPrefix: Record<string, number> = {}
  for (const domain of domains) {
    for (let i = 0; i < counts[domain]; i++) {
      const prefix = DOMAIN_PREFIX[domain]
      seqByPrefix[prefix] = (seqByPrefix[prefix] ?? 30) + r.int(1, 4)
      const id = `RISK-${prefix}-${String(seqByPrefix[prefix]).padStart(4, '0')}`
      const titles = RISK_TITLES[domain]
      const title = titles[i % titles.length]
      const likelihood = r.int(1, 5)
      const impact = r.int(2, 5)
      const inherent = likelihood * impact
      const mitigation = r.int(2, 12)
      const residual = Math.max(1, inherent - mitigation)
      const owner =
        domain === 'Investment'
          ? r.pick(INV_TEAM)
          : domain === 'Compliance'
            ? r.pick(COMPLIANCE_TEAM)
            : domain === 'ThirdParty'
              ? 'imran'
              : r.pick(CISO_TEAM)
      const linkedControls = r
        .sample(controls, r.int(2, 5))
        .map((c) => c.id)
      risks.push({
        id,
        title,
        domain,
        owner,
        likelihood,
        impact,
        inherent,
        residual,
        treatment: r.weighted([
          ['Mitigate', 7],
          ['Accept', 2],
          ['Transfer', 1.5],
          ['Avoid', 0.6],
        ]),
        linkedControls,
        linkedIncidents: [],
        linkedIssues: [],
        status: r.weighted([
          ['Open', 4],
          ['Monitoring', 4],
          ['Mitigated', 2],
          ['Accepted', 1],
        ]),
        trend: r.weighted([
          ['flat', 5],
          ['down', 3],
          ['up', 2],
        ]),
        lastReviewed: iso(new Date(NOW_MS - r.int(3, 90) * 86400000)),
        description: `${title}. Assessed under the SPF enterprise risk taxonomy; inherent ${inherent}, residual ${residual} after current treatment.`,
      })
    }
  }
  return risks
}

// ── Incidents (60; marquee + 4 open High + 55 closed) ───────────────────────
const INCIDENT_TITLES: { t: string; sev: Severity; src: Incident['source'] }[] = [
  { t: 'Phishing campaign targeting operations staff', sev: 'High', src: 'Splunk SIEM' },
  { t: 'Anomalous privileged login on AD domain controller', sev: 'High', src: 'CrowdStrike EDR' },
  { t: 'Critical vulnerability exploit attempt on web edge', sev: 'High', src: 'Qualys VM' },
  { t: 'Suspected data exfiltration from CRM segment', sev: 'High', src: 'Splunk SIEM' },
  { t: 'Malware quarantined on analyst workstation', sev: 'Medium', src: 'CrowdStrike EDR' },
  { t: 'Failed backup job on fund-accounting vault', sev: 'Medium', src: 'Sankalp ServiceDesk (ITSM)' },
  { t: 'Brute-force attempts on subscriber portal', sev: 'Medium', src: 'Splunk SIEM' },
  { t: 'Unauthorized USB device blocked', sev: 'Low', src: 'CrowdStrike EDR' },
  { t: 'Expired TLS certificate on internal API', sev: 'Low', src: 'Sankalp ServiceDesk (ITSM)' },
  { t: 'DLP alert on outbound email with PII', sev: 'Medium', src: 'Splunk SIEM' },
  { t: 'Misconfiguration flagged by AWS Security Hub', sev: 'Medium', src: 'Qualys VM' },
  { t: 'Vendor portal credential reuse detected', sev: 'Low', src: 'Splunk SIEM' },
]

function marqueeTimeline(): TimelineEvent[] {
  // Timeline anchored to the (evergreen) detection moment; offsets preserve the
  // original 02:14-based cadence relative to detection.
  const d = (h: number, m: number, s = 0) => iso(new Date(MARQUEE_DETECTED_MS + ((h - 2) * 3600 + (m - 14) * 60 + s) * 1000))
  return [
    { at: d(2, 14, 0), actor: 'Splunk SIEM', channel: 'Splunk SIEM', kind: 'detect', text: 'Splunk SIEM correlation fired: mass file-encryption + SMB lateral movement on SPF-FA-DB-02 (rule "Ransomware — bulk file rename").' },
    { at: d(2, 15, 30), actor: 'Sankalp ServiceDesk', channel: 'Sankalp ServiceDesk', kind: 'triage', text: 'P1 ticket auto-raised in Sankalp ServiceDesk (ITSM) and bridged to OneGRC as INC-2026-0411.' },
    { at: d(2, 16, 40), actor: 'OneGRC', channel: 'Sankalp ServiceDesk', kind: 'note', text: 'Affected assets enriched from the Sankalp ServiceDesk CMDB: SPF-FA-DB-02, SPF-FA-APP-01, SPF-AD-DC-01 (CIs mapped to NPS fund accounting).' },
    { at: d(2, 19, 0), actor: 'neha', channel: 'OneGRC', kind: 'triage', text: 'SOC analyst Neha Joshi acknowledged P1 and confirmed encryption in progress on the fund-accounting DB.' },
    { at: d(2, 21, 0), actor: 'CrowdStrike EDR', channel: 'CrowdStrike EDR', kind: 'contain', text: 'CrowdStrike EDR auto-isolated SPF-FA-DB-02 on the SIEM signal; process tree captured.' },
    { at: d(2, 23, 0), actor: 'OneGRC', channel: 'OneGRC', kind: 'note', text: 'Auto-classified CRITICAL (PFRDA ICS 2024 taxonomy): subscriber-impacting + personal data involved.' },
    { at: d(2, 24, 0), actor: 'OneGRC', channel: 'OneGRC', kind: 'notify', text: 'Three regulator clocks started from one record: CERT-In (6h), PFRDA (48h), DPDP Board (~72h).' },
    { at: d(2, 31, 0), actor: 'karthik', channel: 'CrowdStrike EDR', kind: 'contain', text: 'SecOps lead Karthik Nair contained: isolated 2 hosts, disabled 4 service accounts, blocked C2 indicators.' },
    { at: d(2, 38, 0), actor: 'OneGRC', channel: 'OneGRC', kind: 'evidence', text: 'Evidence auto-captured to one trail: SIEM correlation log, EDR detection export, memory capture (EVD-44192).' },
    { at: d(2, 52, 0), actor: 'rajesh', channel: 'OneGRC', kind: 'note', text: 'CISO Rajesh Iyer invoked the cyber crisis plan; one incident, one evidence trail, three regulator outputs.' },
    { at: d(3, 40, 0), actor: 'rajesh', channel: 'CERT-In', kind: 'notify', text: 'CERT-In Annexure I draft pre-populated from the incident record; pending CISO sign-off.' },
    { at: d(4, 18, 0), actor: 'meera', channel: 'PFRDA', kind: 'note', text: 'CRO Meera Krishnan briefed; PFRDA 48-hour intimation track confirmed subscriber-impacting.' },
  ]
}

function buildMarquee(): Incident {
  const detected = iso(new Date(MARQUEE_DETECTED_MS))
  const tracks: RegulatorTrack[] = [
    {
      regulator: 'CERT-In',
      clockLabel: 'CERT-In · 6-hour incident report',
      windowHours: 6,
      clockStartedAt: detected,
      deadline: iso(new Date(MARQUEE_DETECTED_MS + 6 * 3600000)),
      status: 'At risk',
      output: 'CERT-In Incident Report — Annexure I (Direction 20(3)/2022)',
    },
    {
      regulator: 'PFRDA',
      clockLabel: 'PFRDA · 48-hour ICS intimation',
      windowHours: 48,
      clockStartedAt: detected,
      deadline: iso(new Date(MARQUEE_DETECTED_MS + 48 * 3600000)),
      status: 'On track',
      output: 'PFRDA ICS incident intimation + quarterly Annexure (subscriber-impacting)',
    },
    {
      regulator: 'DPDP Board',
      clockLabel: 'DPDP Board · ~72-hour breach intimation',
      windowHours: 72,
      clockStartedAt: detected,
      deadline: iso(new Date(MARQUEE_DETECTED_MS + 72 * 3600000)),
      status: 'On track',
      output: 'DPDP personal-data-breach intimation to Board & affected principals',
    },
  ]
  return {
    id: 'INC-2026-0411',
    title: 'Ransomware on fund-accounting server',
    classification: 'Critical',
    detectedAt: detected,
    source: 'Splunk SIEM',
    assets: ['SPF-FA-DB-02 (Fund Accounting DB)', 'SPF-FA-APP-01', 'SPF-AD-DC-01'],
    owner: 'rajesh',
    status: 'Contained',
    regulatorTracks: tracks,
    timeline: marqueeTimeline(),
    subscriberImpacting: true,
    personalDataInvolved: true,
    linkedRisks: [],
    linkedControls: [],
    linkedIssues: [],
    evidence: [],
    summary:
      'Splunk SIEM correlated mass file-encryption with SMB lateral movement on the fund-accounting database SPF-FA-DB-02 in the early hours and auto-raised a P1 ticket in Sankalp ServiceDesk (the in-house ITSM); affected assets were enriched from the ServiceDesk CMDB. CrowdStrike EDR auto-isolated the host and SecOps contained lateral movement within 17 minutes. Because the event is subscriber-impacting and involves personal data, OneGRC auto-classified it Critical (PFRDA ICS 2024) and opened three regulator tracks on one clock — CERT-In (6h), PFRDA (48h), DPDP Board (~72h) — driving three regulator outputs from a single incident record and one evidence trail.',
  }
}

function buildIncidents(): Incident[] {
  const r = new Rand(2026)
  const incidents: Incident[] = [buildMarquee()]

  // 4 additional OPEN High incidents with live regulator tracks
  for (let i = 0; i < 4; i++) {
    const spec = INCIDENT_TITLES[i]
    const num = 405 - i
    const detectedHrsAgo = r.int(8, 40)
    const detected = iso(new Date(NOW_MS - detectedHrsAgo * 3600000))
    const subImpact = r.bool(0.5)
    const pdInvolved = r.bool(0.6)
    const tracks: RegulatorTrack[] = []
    const certWindow = 6
    tracks.push({
      regulator: 'CERT-In',
      clockLabel: 'CERT-In · 6-hour incident report',
      windowHours: certWindow,
      clockStartedAt: detected,
      deadline: iso(new Date(new Date(detected).getTime() + certWindow * 3600000)),
      status: 'Filed',
      output: 'CERT-In Incident Report — Annexure I',
    })
    if (pdInvolved) {
      tracks.push({
        regulator: 'DPDP Board',
        clockLabel: 'DPDP Board · ~72-hour breach intimation',
        windowHours: 72,
        clockStartedAt: detected,
        deadline: iso(new Date(new Date(detected).getTime() + 72 * 3600000)),
        status: r.weighted([['On track', 3], ['At risk', 1]]),
        output: 'DPDP personal-data-breach intimation',
      })
    }
    incidents.push({
      id: `INC-2026-0${num}`,
      title: spec.t,
      classification: 'High',
      detectedAt: detected,
      source: spec.src,
      assets: r.sample(FA_ASSETS, r.int(1, 3)),
      owner: r.pick(CISO_TEAM),
      status: r.pick(['Open', 'Contained'] as const),
      regulatorTracks: tracks,
      timeline: [
        { at: detected, actor: spec.src, channel: spec.src.includes('Splunk') ? 'Splunk SIEM' : 'CrowdStrike EDR', kind: 'detect', text: `${spec.t} detected.` },
        { at: iso(new Date(new Date(detected).getTime() + 12 * 60000)), actor: 'neha', channel: 'OneGRC', kind: 'triage', text: 'Triaged by SOC; incident opened.' },
        { at: iso(new Date(new Date(detected).getTime() + 50 * 60000)), actor: 'karthik', channel: 'OneGRC', kind: 'contain', text: 'Containment actions applied.' },
      ],
      subscriberImpacting: subImpact,
      personalDataInvolved: pdInvolved,
      linkedRisks: [],
      linkedControls: [],
      linkedIssues: [],
      evidence: [],
      summary: `${spec.t}. Detected via ${spec.src}; under active response by the SecOps team.`,
    })
  }

  // 55 closed historical incidents
  for (let i = 0; i < 55; i++) {
    const spec = INCIDENT_TITLES[(i + 4) % INCIDENT_TITLES.length]
    const num = 400 - i - 5
    const daysAgo = r.int(6, 150)
    const detected = iso(new Date(NOW_MS - daysAgo * 86400000 - r.int(0, 20) * 3600000))
    incidents.push({
      id: `INC-2026-${String(num).padStart(4, '0')}`,
      title: spec.t,
      classification: spec.sev,
      detectedAt: detected,
      source: spec.src,
      assets: r.sample(FA_ASSETS, r.int(1, 2)),
      owner: r.pick(CISO_TEAM),
      status: 'Closed',
      regulatorTracks:
        spec.sev === 'High' || spec.sev === 'Critical'
          ? [
              {
                regulator: 'CERT-In',
                clockLabel: 'CERT-In · 6-hour incident report',
                windowHours: 6,
                clockStartedAt: detected,
                deadline: iso(new Date(new Date(detected).getTime() + 6 * 3600000)),
                status: 'Filed',
                output: 'CERT-In Incident Report — Annexure I',
              },
            ]
          : [],
      timeline: [
        { at: detected, actor: spec.src, channel: spec.src.includes('Splunk') ? 'Splunk SIEM' : 'CrowdStrike EDR', kind: 'detect', text: `${spec.t} detected.` },
        { at: iso(new Date(new Date(detected).getTime() + 36 * 3600000)), actor: 'karthik', channel: 'OneGRC', kind: 'note', text: 'Resolved and closed with post-incident review.' },
      ],
      subscriberImpacting: r.bool(0.2),
      personalDataInvolved: r.bool(0.3),
      linkedRisks: [],
      linkedControls: [],
      linkedIssues: [],
      evidence: [],
      summary: `${spec.t}. Resolved and closed; retained for trend analysis and lessons learned.`,
    })
  }
  return incidents
}

// ── Obligations (180; 9 overdue, 23 due ≤30 days) ───────────────────────────
const OBLIGATION_DEFS: {
  reg: Regulator
  title: string
  freq: string
  ref: string
  team: string[]
  requirement: string
  applicability: string
}[] = [
  { reg: 'PFRDA', title: 'Quarterly compliance return (Annexure)', freq: 'Quarterly', ref: 'PFRDA/2025/05/ICS/01', team: ['anjali', 'arvind'], requirement: 'File the quarterly compliance Annexure with PFRDA within the prescribed window, certified by the Compliance Officer.', applicability: 'SPF is a PFRDA-registered NPS Pension Fund Manager (Category I Regulated Entity) and must report on the PFRDA ICS compliance cadence.' },
  { reg: 'PFRDA', title: 'Monthly NAV & AUM statement', freq: 'Monthly', ref: 'PFRDA-NAV', team: ['arvind', 'sanjay'], requirement: 'Submit the monthly scheme-wise NAV and AUM statement to PFRDA and the NPS Trust, reconciled to the CRA records.', applicability: 'SPF manages NPS Scheme E/C/G/A across Tier I & II and must report scheme NAV/AUM as a PFM.' },
  { reg: 'PFRDA', title: 'Half-yearly ICS self-assessment', freq: 'Half-yearly', ref: 'ICS-50', team: ['anjali', 'rajesh'], requirement: 'Complete the half-yearly Information & Cyber Security self-assessment against the PFRDA ICS Guidelines and place it before the board.', applicability: 'As a PFRDA intermediary, SPF must maintain and self-attest a board-approved ICS posture aligned to ISO 27001 / NIST CSF.' },
  { reg: 'PFRDA', title: 'Annual cyber-security audit submission', freq: 'Annual', ref: 'ICS-50', team: ['rajesh', 'sunita'], requirement: 'Submit the annual cyber-security audit report (CERT-In empanelled auditor) to PFRDA with the closure status of findings.', applicability: 'PFRDA ICS Guidelines require regulated intermediaries to undergo and file an annual independent IS audit.' },
  { reg: 'PFRDA', title: 'Investment committee minutes filing', freq: 'Quarterly', ref: 'ICS-46', team: ['arvind', 'vikram'], requirement: 'Record and file the Investment Committee minutes evidencing the periodic review of the approved investment universe.', applicability: 'The PFRDA Master Circular on Investment Guidelines requires SPF to review its portfolio and universe and minute it at the Investment Committee.' },
  { reg: 'PFRDA', title: 'Exposure-limit breach report', freq: 'Event-based', ref: 'ICS-40', team: ['sanjay', 'arvind'], requirement: 'Report any breach of prescribed investment exposure limits to PFRDA, with the cause and the corrective action taken.', applicability: 'SPF’s scheme portfolios are bound by PFRDA investment exposure limits; breaches are reportable events for a PFM.' },
  { reg: 'CERT-In', title: 'Cyber incident summary report', freq: 'Monthly', ref: '20(3)/2022', team: ['rajesh', 'karthik'], requirement: 'Report cyber incidents to CERT-In within six hours of detection and provide the periodic incident summary.', applicability: 'As a body corporate operating ICT systems in India, SPF is bound by CERT-In Direction 20(3)/2022.' },
  { reg: 'CERT-In', title: 'Log retention & NTP sync attestation', freq: 'Quarterly', ref: '20(3)/2022', team: ['karthik', 'rohan'], requirement: 'Maintain logs for a rolling 180 days within Indian jurisdiction and keep ICT system clocks synchronised to NTP; attest the same.', applicability: 'CERT-In Direction 20(3)/2022 mandates in-India 180-day log retention and NTP synchronisation for SPF’s systems.' },
  { reg: 'DPDP', title: 'Consent records reconciliation', freq: 'Quarterly', ref: 'DPDP-Rules-2025', team: ['priya', 'anjali'], requirement: 'Reconcile the consent ledger for subscriber personal data and evidence a valid lawful basis for each processing purpose.', applicability: 'SPF is a Data Fiduciary processing PRAN/KYC/nominee data and must maintain consent under the DPDP Act, 2023 r/w DPDP Rules, 2025.' },
  { reg: 'DPDP', title: 'DSAR fulfilment status report', freq: 'Monthly', ref: 'DPDP-Rules-2025', team: ['priya'], requirement: 'Track and report Data Principal request (access/correction/erasure) fulfilment within the prescribed timelines.', applicability: 'As a Data Fiduciary, SPF must honour Data Principal rights for subscriber personal data under the DPDP framework.' },
  { reg: 'GST', title: 'GSTR-3B monthly return', freq: 'Monthly', ref: 'GSTR-3B', team: ['deepa'], requirement: 'File the monthly GSTR-3B summary return and discharge the net tax liability by the due date.', applicability: 'SPF is a GST-registered person and must furnish GSTR-3B under Section 39 of the CGST Act, 2017.' },
  { reg: 'GST', title: 'GSTR-1 outward supplies', freq: 'Monthly', ref: 'GSTR-1', team: ['deepa'], requirement: 'File the monthly GSTR-1 statement of outward supplies (management/advisory fees) by the due date.', applicability: 'SPF is a GST-registered person and must report outward supplies under Section 37 / Section 39 of the CGST Act, 2017.' },
  { reg: 'GST', title: 'GSTR-9C reconciliation statement', freq: 'Annual', ref: 'GSTR-9C', team: ['deepa'], requirement: 'File the annual GSTR-9 return with the GSTR-9C reconciliation statement reconciling the books to the returns.', applicability: 'SPF’s aggregate turnover crosses the GSTR-9C threshold, attracting the annual reconciliation requirement.' },
  { reg: 'Labour', title: 'PF & ESI monthly challan', freq: 'Monthly', ref: 'EPFO', team: ['farhan'], requirement: 'Remit employee/employer provident-fund contributions via the monthly ECR challan by the statutory due date.', applicability: 'SPF is a covered establishment under the EPF & MP Act, 1952; late deposit attracts damages (s.14B) and interest (s.7Q).' },
  { reg: 'Labour', title: 'Professional tax remittance', freq: 'Monthly', ref: 'PT', team: ['farhan'], requirement: 'Deduct and remit state professional tax on employee salaries and file the periodic PT return.', applicability: 'SPF employs staff in states levying professional tax and must deduct and deposit it as an employer.' },
  { reg: 'Companies Act', title: 'Board meeting & minutes', freq: 'Quarterly', ref: 'CA-2013-173', team: ['vikram'], requirement: 'Convene at least four board meetings a year with the maximum gap prescribed, and record and sign the minutes.', applicability: 'SPF is a company incorporated under the Companies Act, 2013 and bound by the Section 173 board-cadence requirement.' },
  { reg: 'Companies Act', title: 'Audit committee meeting', freq: 'Quarterly', ref: 'CA-2013-177', team: ['vikram', 'sunita'], requirement: 'Hold the Audit Committee meetings, review the financials and internal controls, and minute the proceedings.', applicability: 'SPF meets the Section 177 thresholds and must constitute and operate an Audit Committee.' },
  { reg: 'Companies Act', title: 'Annual return MGT-7 filing', freq: 'Annual', ref: 'MGT-7', team: ['vikram', 'farhan'], requirement: 'File the annual return in Form MGT-7 with the Registrar of Companies within the period specified after the AGM.', applicability: 'Section 92(5) of the Companies Act, 2013 requires SPF to file its annual return; delay attracts a per-day penalty.' },
]

function obligationCode(reg: Regulator): string {
  switch (reg) {
    case 'PFRDA': return 'PFRDA'
    case 'CERT-In': return 'CERTIN'
    case 'DPDP': return 'DPDP'
    case 'GST': return 'GST'
    case 'Labour': return 'LAB'
    case 'Companies Act': return 'CA'
  }
}

function buildObligations(): Obligation[] {
  const r = new Rand(180)
  const obligations: Obligation[] = []
  // status plan: 9 overdue, 23 due ≤30d, rest filed/in-review
  const statuses: Obligation['status'][] = []
  for (let i = 0; i < 9; i++) statuses.push('Overdue')
  for (let i = 0; i < 23; i++) statuses.push('Due')
  for (let i = 0; i < 28; i++) statuses.push('In review')
  for (let i = 0; i < 120; i++) statuses.push('Filed')
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1))
    ;[statuses[i], statuses[j]] = [statuses[j], statuses[i]]
  }

  const seq: Record<string, number> = {}
  for (let i = 0; i < 180; i++) {
    const def = OBLIGATION_DEFS[i % OBLIGATION_DEFS.length]
    const code = obligationCode(def.reg)
    seq[code] = (seq[code] ?? 0) + 1
    const period = r.pick(['Q1', 'Q2', 'Q3', 'JUN26', 'MAY26', 'FY26', 'APR26', 'H1'])
    const id = `OBL-${code}-${period}-${String(seq[code]).padStart(2, '0')}`
    const status = statuses[i]
    let dueDate: string
    if (status === 'Overdue') dueDate = iso(new Date(NOW_MS - r.int(1, 18) * 86400000))
    else if (status === 'Due') dueDate = iso(new Date(NOW_MS + r.int(1, 30) * 86400000))
    else if (status === 'In review') dueDate = iso(new Date(NOW_MS + r.int(2, 20) * 86400000))
    else dueDate = iso(new Date(NOW_MS - r.int(5, 120) * 86400000))
    const maker = r.pick(def.team)
    const checker = r.pick(def.reg === 'PFRDA' ? ['meera', 'anjali'] : ['anjali', 'vikram', 'meera'])
    // Filed cycles carry an actual filed date — mostly on time, ~20% late (E2.3).
    // Derived from the loop index only (no RNG draw) so obligation ids stay stable.
    const filedAt =
      status === 'Filed'
        ? iso(new Date(new Date(dueDate).getTime() + (i % 5 === 0 ? 3 + (i % 7) : -(i % 4)) * 86400000))
        : undefined
    obligations.push({
      id,
      regulator: def.reg,
      title: def.title,
      frequency: def.freq,
      dueDate,
      owner: maker,
      status,
      filedAt,
      makerChecker: {
        maker,
        checker,
        state:
          status === 'Filed'
            ? 'Approved'
            : status === 'In review'
              ? 'Submitted'
              : status === 'Overdue'
                ? 'Pending'
                : 'Drafted',
      },
      evidence: [],
      reference: def.ref,
      requirement: def.requirement,
      applicability: def.applicability,
      origin: 'External',
    })
  }

  // Internal, policy-driven duties - handled identically to statutory filings
  // (spec 5.2 / Req 2). Statuses are chosen so they do NOT change the curated
  // 9-overdue / 23-due anchors. One is deliberately completed-but-lacking-evidence
  // to make the "done but not documented" gap visible.
  // Investment Research & Review Policy chain (policy-driven, not a statutory
  // filing). The firm's board-approved investment policy spawns research-review
  // duties the law alone does not spell out: active holdings reviewed twice a
  // week, the PFRDA top-250 universe annually, allocated across eight sector
  // analysts, each evidenced by a signed research note tabled in the Investment
  // Sub-Committee (IISC) minutes. A past PFRDA inspection flagged that the
  // reviews were done but not documented — so the platform forces and captures
  // the evidence per cycle, per sector. W1 is the live cycle (4 of 8 sector
  // notes in, IISC minute pending); PREVW is the closed, audit-ready prior cycle.
  const invResReviewReq =
    'Each sector analyst reviews their actively invested holdings against the board-approved universe and files a signed research note; the consolidated review is tabled and minuted at the Investment Sub-Committee (IISC).'
  const invResApplicability =
    'Set by the board-approved Investment Research & Review Policy — per-sector ownership and per-cycle documentation that the statute alone does not spell out.'
  const invResStep = (
    seq: number, title: string, maker: string, offsetDays: number,
    status: ObligationSubStep['status'], ev?: string, dep?: number,
  ): ObligationSubStep => ({
    id: `OBL-INT-INVRES-W1-S${seq}`, seq, title, clauseRef: 'SRC-PFRDA-INV-REVIEW',
    maker, checker: 'arvind', dueDate: iso(new Date(NOW_MS + offsetDays * 86400000)),
    status, evidenceId: ev, dependsOnSeq: dep,
  })
  obligations.push(
    {
      id: 'OBL-INT-INVRES-W1', regulator: 'PFRDA', title: 'Active-holdings research review (bi-weekly cycle)', frequency: 'Twice a week',
      // 'In review' (not 'Due'): 4 of 8 sector notes are in and the IISC minute is
      // pending — and it holds the curated 23-due-≤30d anchor (its predecessor
      // obligation was also 'In review').
      dueDate: daysFromNow(1), owner: 'arvind', status: 'In review',
      makerChecker: { maker: 'arvind', checker: 'meera', state: 'Submitted' },
      evidence: ['EVD-44620', 'EVD-44621', 'EVD-44622', 'EVD-44623'], reference: 'IRRP-ACTIVE',
      requirement: invResReviewReq, applicability: invResApplicability, origin: 'Internal',
      policySource: 'Investment Research & Review Policy', sourceRefs: ['SRC-PFRDA-INV-REVIEW'],
      subSteps: [
        invResStep(1, 'Review active holdings — Banking & Financials', 'aditya', 0, 'Done', 'EVD-44620'),
        invResStep(2, 'Review active holdings — IT & Technology', 'sneha', 0, 'Done', 'EVD-44621'),
        invResStep(3, 'Review active holdings — Pharma & Healthcare', 'rahul', 0, 'Done', 'EVD-44622'),
        invResStep(4, 'Review active holdings — FMCG & Consumer', 'pooja', 0, 'Done', 'EVD-44623'),
        invResStep(5, 'Review active holdings — Energy & Utilities', 'vivek', 1, 'Pending'),
        invResStep(6, 'Review active holdings — Auto & Industrials', 'kavya', 1, 'Pending'),
        invResStep(7, 'Review active holdings — Metals & Materials', 'manish', 1, 'Pending'),
        invResStep(8, 'Review active holdings — Infrastructure & Realty', 'divya', 1, 'Pending'),
        { id: 'OBL-INT-INVRES-W1-S9', seq: 9, title: 'Consolidate sector research notes and record the IISC minutes', clauseRef: 'SRC-PFRDA-INV-REVIEW', maker: 'arvind', checker: 'meera', dueDate: daysFromNow(1), status: 'Pending', dependsOnSeq: 8 },
      ],
    },
    {
      id: 'OBL-INT-INVRES-PREVW', regulator: 'PFRDA', title: 'Active-holdings research review (prior bi-weekly cycle)', frequency: 'Twice a week',
      dueDate: iso(new Date(NOW_MS - 3 * 86400000)), owner: 'arvind', status: 'Filed',
      makerChecker: { maker: 'arvind', checker: 'meera', state: 'Approved' },
      evidence: ['EVD-44624', 'EVD-44625'], reference: 'IRRP-ACTIVE',
      filedAt: iso(new Date(NOW_MS - 3 * 86400000 - 5 * 3600000)),
      requirement: invResReviewReq, applicability: invResApplicability, origin: 'Internal',
      policySource: 'Investment Research & Review Policy', sourceRefs: ['SRC-PFRDA-INV-REVIEW'],
    },
    {
      id: 'OBL-INT-INVRES-FY', regulator: 'PFRDA', title: 'Annual top-250 universe research review', frequency: 'Annual',
      dueDate: daysFromNow(22), owner: 'sanjay', status: 'In review',
      makerChecker: { maker: 'sanjay', checker: 'arvind', state: 'Submitted' },
      evidence: ['EVD-44626', 'EVD-44627'], reference: 'IRRP-UNIVERSE',
      requirement: 'Review the full PFRDA top-250 investable universe for the year — re-confirm eligibility and research conclusions across every sector — and minute the review at the Investment Sub-Committee (IISC).',
      applicability: invResApplicability, origin: 'Internal',
      policySource: 'Investment Research & Review Policy', sourceRefs: ['SRC-PFRDA-INV-REVIEW'],
    },
    {
      id: 'OBL-INT-CONSENT-H1', regulator: 'DPDP', title: 'Half-yearly consent-ledger reconciliation', frequency: 'Half-yearly',
      dueDate: iso(new Date(NOW_MS + 16 * 86400000)), owner: 'priya', status: 'In review',
      makerChecker: { maker: 'priya', checker: 'anjali', state: 'Submitted' }, evidence: ['EVD-44400'], reference: 'DP-CONSENT-H1',
      requirement: 'Reconcile the consent ledger against active processing and remediate gaps.',
      applicability: 'Set by the firm’s own data-protection policy.', origin: 'Internal',
      policySource: 'Data Protection & Privacy Policy', sourceRefs: ['SRC-DPDP-6'],
    },
    {
      id: 'OBL-INT-ACCESS-Q1', regulator: 'CERT-In', title: 'Quarterly privileged-access recertification', frequency: 'Quarterly',
      dueDate: iso(new Date(NOW_MS - 100 * 86400000)), owner: 'rohan', status: 'Filed',
      makerChecker: { maker: 'rohan', checker: 'rajesh', state: 'Approved' }, evidence: ['EVD-44192'], reference: 'IS-ACCESS-Q1',
      requirement: 'Recertify privileged access to the CRA interface and fund-accounting systems.',
      applicability: 'Set by the firm’s own information-security policy.', origin: 'Internal',
      policySource: 'Information Security Policy',
    },
  )
  return obligations
}

// ── Policies (45) ───────────────────────────────────────────────────────────
const POLICY_DEFS: { title: string; cat: string; owner: string }[] = [
  { title: 'Information Security Policy', cat: 'Security', owner: 'rajesh' },
  { title: 'Access Control & Identity Policy', cat: 'Security', owner: 'rohan' },
  { title: 'Acceptable Use Policy', cat: 'Security', owner: 'rajesh' },
  { title: 'Cryptography & Key Management Policy', cat: 'Security', owner: 'karthik' },
  { title: 'Vulnerability & Patch Management Policy', cat: 'Security', owner: 'rohan' },
  { title: 'Incident Response Policy', cat: 'Security', owner: 'rajesh' },
  { title: 'Business Continuity & DR Policy', cat: 'Resilience', owner: 'meera' },
  { title: 'Backup & Recovery Policy', cat: 'Resilience', owner: 'rohan' },
  { title: 'Data Classification & Handling Policy', cat: 'Data', owner: 'priya' },
  { title: 'Data Privacy (DPDP) Policy', cat: 'Data', owner: 'priya' },
  { title: 'Data Retention & Disposal Policy', cat: 'Data', owner: 'priya' },
  { title: 'Third-Party & Outsourcing Risk Policy', cat: 'Risk', owner: 'imran' },
  { title: 'Cloud Security Policy', cat: 'Security', owner: 'karthik' },
  { title: 'Change Management Policy', cat: 'IT', owner: 'rohan' },
  { title: 'Logging & Monitoring Policy', cat: 'Security', owner: 'karthik' },
  { title: 'Enterprise Risk Management Policy', cat: 'Risk', owner: 'meera' },
  { title: 'Investment Risk & Exposure Policy', cat: 'Investment', owner: 'arvind' },
  { title: 'Code of Conduct', cat: 'Governance', owner: 'vikram' },
  { title: 'Whistleblower Policy', cat: 'Governance', owner: 'vikram' },
  { title: 'Anti-Money-Laundering & KYC Policy', cat: 'Compliance', owner: 'anjali' },
  { title: 'Regulatory Change Management Policy', cat: 'Compliance', owner: 'anjali' },
  { title: 'Physical & Environmental Security Policy', cat: 'Security', owner: 'rohan' },
  { title: 'Remote Working Policy', cat: 'IT', owner: 'rohan' },
  { title: 'Secure Development Policy', cat: 'IT', owner: 'rohan' },
  { title: 'Vendor Code of Conduct', cat: 'Risk', owner: 'imran' },
]

function buildPolicies(controls: Control[]): Policy[] {
  const r = new Rand(45)
  const policies: Policy[] = []
  for (let i = 0; i < 45; i++) {
    const def = POLICY_DEFS[i % POLICY_DEFS.length]
    const dup = i >= POLICY_DEFS.length ? ` (${r.pick(['CRA', 'Corporate', 'Cloud', 'Branch'])} addendum)` : ''
    const major = r.int(1, 4)
    const minor = r.int(0, 6)
    policies.push({
      id: `POL-${String(i + 1).padStart(3, '0')}`,
      title: def.title + dup,
      version: `v${major}.${minor}`,
      owner: def.owner,
      approvedBy: r.pick(['meera', 'rajesh', 'vikram']),
      approvedOn: iso(new Date(NOW_MS - r.int(60, 400) * 86400000)),
      nextReview: iso(new Date(NOW_MS + r.int(-20, 240) * 86400000)),
      mappedControls: r.sample(controls, r.int(3, 9)).map((c) => c.id),
      status: r.weighted([['Published', 8], ['In review', 2], ['Draft', 1]]),
      category: def.cat,
    })
  }
  return policies
}

// ── Issues (120; 27 derive open audit findings linkage handled in audits) ───
function buildIssues(controls: Control[], incidents: Incident[]): Issue[] {
  const r = new Rand(120)
  const issues: Issue[] = []
  const failControls = controls.filter((c) => c.result === 'Fail' || c.result === 'Partial')
  for (let i = 0; i < 120; i++) {
    const num = 100 + i
    const source = r.weighted<Issue['source']>([
      ['Control failure', 4],
      ['Audit finding', 3],
      ['Incident', 2],
    ])
    let sourceRef = ''
    let linkedControls: string[] = []
    if (source === 'Control failure') {
      const c = r.pick(failControls.length ? failControls : controls)
      sourceRef = c.id
      linkedControls = [c.id]
    } else if (source === 'Incident') {
      sourceRef = r.pick(incidents).id
    } else {
      sourceRef = `AUD-${r.pick(['IS', 'INT', 'PFRDA'])}-2026-${String(r.int(1, 8)).padStart(2, '0')}`
    }
    const ageDays = r.int(2, 140)
    const dueOffset = r.int(-25, 45)
    const status = r.weighted<Issue['status']>([
      ['Open', 3],
      ['In progress', 4],
      ['Overdue', 2],
      ['Resolved', 3],
    ])
    issues.push({
      id: `ISS-2026-${String(num).padStart(4, '0')}`,
      title: titleForIssue(source, sourceRef, r),
      source,
      sourceRef,
      severity: r.weighted<Severity>([
        ['Critical', 1],
        ['High', 3],
        ['Medium', 5],
        ['Low', 3],
      ]),
      owner: r.pick([...CISO_TEAM, ...COMPLIANCE_TEAM, ...INV_TEAM]),
      dueDate: iso(new Date(NOW_MS + dueOffset * 86400000)),
      ageDays,
      status,
      linkedControls,
    })
  }
  return issues
}

function titleForIssue(source: Issue['source'], ref: string, r: Rand): string {
  if (source === 'Control failure')
    return `Remediate failing control ${ref} — ${r.pick(['evidence gap', 'config drift', 'overdue re-test', 'exception expired'])}`
  if (source === 'Incident')
    return `Post-incident action from ${ref} — ${r.pick(['harden access', 'patch affected hosts', 'update runbook', 'tune detection'])}`
  return `Audit finding remediation (${ref}) — ${r.pick(['segregation of duties', 'access recertification', 'logging coverage', 'policy update'])}`
}

// ── Evidence (600; ~70% auto) ───────────────────────────────────────────────
function buildEvidence(controls: Control[], obligations: Obligation[]): Evidence[] {
  const r = new Rand(600)
  const ev: Evidence[] = []
  const types: Evidence['type'][] = ['Screenshot', 'Log', 'Config export', 'Attestation', 'Filing ack']
  const sources = ['AWS Security Hub', 'Splunk SIEM', 'Qualys VM', 'CrowdStrike EDR', 'Okta/AD', 'Sankalp ServiceDesk', 'Consent & Privacy platform', 'ClearTax']
  for (let i = 0; i < 600; i++) {
    const id = `EVD-${44000 + i}`
    const auto = i < 420 // 70%
    const type = auto ? r.pick(['Log', 'Config export', 'Screenshot'] as Evidence['type'][]) : r.pick(types)
    const linkedControls = r.sample(controls, r.int(1, 2)).map((c) => c.id)
    const linkObl = r.bool(0.35) ? r.sample(obligations, 1).map((o) => o.id) : []
    const ctrl = controls.find((c) => c.id === linkedControls[0])
    ev.push({
      id,
      title: evidenceTitle(type, ctrl?.title ?? 'control', r),
      type,
      capturedAt: iso(new Date(NOW_MS - r.int(0, 120) * 86400000 - r.int(0, 1400) * 60000)),
      capturedBy: auto ? 'CCM (auto)' : r.pick([...CISO_TEAM, ...COMPLIANCE_TEAM]),
      auto,
      linkedControls,
      linkedObligations: linkObl,
      frameworkRefs: ctrl?.frameworks ?? ['ISO 27001'],
      source: auto ? r.pick(sources) : 'Manual upload',
    })
  }
  return ev
}

function evidenceTitle(type: Evidence['type'], ctrlTitle: string, r: Rand): string {
  switch (type) {
    case 'Log': return `${r.pick(['Access', 'Audit', 'SIEM', 'Patch'])} log export — ${ctrlTitle}`
    case 'Config export': return `Config baseline export — ${ctrlTitle}`
    case 'Screenshot': return `Console screenshot — ${ctrlTitle}`
    case 'Attestation': return `Signed attestation — ${ctrlTitle}`
    case 'Filing ack': return `Regulatory filing acknowledgement — ${ctrlTitle}`
  }
}

// ── Audits (18; total OPEN findings = 27) ───────────────────────────────────
function buildAudits(): Audit[] {
  const r = new Rand(18)
  const audits: Audit[] = []
  const defs: { title: string; type: Audit['type']; auditor: string }[] = [
    { title: 'Annual IS Audit FY2025-26', type: 'IS audit (CERT-In empanelled)', auditor: 'SecureLayer (CERT-In empanelled)' },
    { title: 'PFRDA ICS Compliance Audit', type: 'PFRDA', auditor: 'PFRDA-appointed auditor' },
    { title: 'Internal Audit — Access Management', type: 'Internal', auditor: 'Lakshmi Rao' },
    { title: 'Internal Audit — Investment Operations', type: 'Internal', auditor: 'Lakshmi Rao' },
    { title: 'Internal Audit — DPDP Readiness', type: 'Internal', auditor: 'Sunita Menon' },
    { title: 'Internal Audit — GST & Tax', type: 'Internal', auditor: 'Lakshmi Rao' },
    { title: 'Cloud Security Review (AWS)', type: 'IS audit (CERT-In empanelled)', auditor: 'SecureLayer' },
    { title: 'Internal Audit — BCP/DR', type: 'Internal', auditor: 'Sunita Menon' },
  ]
  // distribute 27 open findings across audits
  const openPlan = [6, 5, 4, 3, 3, 2, 2, 2] // sums to 27
  for (let i = 0; i < 18; i++) {
    const def = defs[i % defs.length]
    const idType = def.type.startsWith('IS') ? 'IS' : def.type === 'PFRDA' ? 'PFRDA' : 'INT'
    const id = `AUD-${idType}-2026-${String(i + 1).padStart(2, '0')}`
    const findings: AuditFinding[] = []
    const openCount = i < openPlan.length ? openPlan[i] : 0
    const closedCount = r.int(2, 8)
    for (let f = 0; f < openCount; f++) {
      findings.push({
        id: `${id}-F${f + 1}`,
        title: r.pick([
          'Privileged access not recertified within policy window',
          'Patch SLA exceeded on internet-facing assets',
          'Logging gaps on the NAV engine',
          'Segregation of duties weakness in payments',
          'Backup restoration test overdue',
          'DPDP consent records incomplete for legacy subscribers',
          'Exposure-limit monitoring not fully automated',
          'Vendor due-diligence documentation incomplete',
        ]),
        severity: r.weighted<Severity>([['Critical', 1], ['High', 3], ['Medium', 4], ['Low', 2]]),
        status: r.bool(0.5) ? 'Open' : 'Remediation',
      })
    }
    for (let f = 0; f < closedCount; f++) {
      findings.push({
        id: `${id}-C${f + 1}`,
        title: r.pick(['Closed finding — control retested', 'Closed finding — evidence provided', 'Closed finding — policy updated']),
        severity: r.weighted<Severity>([['High', 1], ['Medium', 3], ['Low', 4]]),
        status: 'Closed',
      })
    }
    audits.push({
      id,
      title: i < defs.length ? def.title : `${def.title} (cycle ${Math.floor(i / defs.length) + 1})`,
      type: def.type,
      auditor: def.auditor,
      period: r.pick(['Q1 FY2026-27', 'Q4 FY2025-26', 'FY2025-26', 'H1 FY2026-27']),
      status: i < openPlan.length ? r.pick(['Fieldwork', 'Reporting'] as const) : 'Closed',
      findings,
      scope: r.pick([
        'CRA interface, fund accounting and subscriber web',
        'Identity, access and privileged accounts',
        'Investment operations and exposure limits',
        'Data privacy, consent and DSAR handling',
      ]),
    })
  }
  return audits
}

// ── Regulatory changes (90) ─────────────────────────────────────────────────
function buildRegChanges(): RegulatoryChange[] {
  const r = new Rand(90)
  const changes: RegulatoryChange[] = []
  const feed: { summary: string; reg: Regulator; src: RegulatoryChange['source']; detail: string }[] = [
    { summary: 'GSTR-3B table 4 ITC reporting format revised', reg: 'GST', src: 'Regulatory Intelligence feed', detail: 'CBIC notification revises the GSTR-3B Table 4 auto-population and ITC reversal disclosure. The monthly GSTR-3B obligation template and the reconciliation control are auto-updated; owner Deepa Iyer alerted.' },
    { summary: 'PFRDA revises scheme-wise exposure caps for Scheme E', reg: 'PFRDA', src: 'PFRDA circular', detail: 'PFRDA circular tightens single-issuer and sectoral exposure caps for Scheme E. The exposure-limit monitoring control and the quarterly investment return obligation are auto-updated; owners Arvind Patel and Sanjay Verma alerted.' },
    { summary: 'CERT-In reiterates 6-hour reporting & log retention', reg: 'CERT-In', src: 'Regulatory Intelligence feed', detail: 'Advisory reiterates Direction 20(3)/2022 — 6-hour incident reporting, 180-day in-India log retention and NTP synchronization.' },
    { summary: 'DPDP Rules 2025 notify consent-manager obligations', reg: 'DPDP', src: 'Regulatory Intelligence feed', detail: 'DPDP Rules 2025 operationalize consent-manager registration and breach intimation timelines.' },
    { summary: 'Companies Act — CSR disclosure amendment', reg: 'Companies Act', src: 'Regulatory Intelligence feed', detail: 'MCA amends CSR reporting in the board report.' },
    { summary: 'Labour codes — wage definition clarification', reg: 'Labour', src: 'Regulatory Intelligence feed', detail: 'Clarification on wage definition impacting PF contribution computation.' },
    { summary: 'PFRDA committee cadence guidance updated', reg: 'PFRDA', src: 'PFRDA circular', detail: 'Guidance on Risk, Audit, Investment and NRC committee frequency and minute-keeping.' },
    { summary: 'GST e-invoicing threshold revised', reg: 'GST', src: 'Regulatory Intelligence feed', detail: 'e-invoicing applicability threshold revised.' },
  ]
  const statuses: RegulatoryChange['status'][] = ['Assessed', 'In progress', 'Closed']
  for (let i = 0; i < 90; i++) {
    const def = feed[i % feed.length]
    changes.push({
      id: `RCM-2026-${String(118 - i).padStart(3, '0')}`,
      source: def.src,
      summary: def.summary,
      regulator: def.reg,
      publishedAt: iso(new Date(NOW_MS - r.int(0, 150) * 86400000 - r.int(0, 1400) * 60000)),
      impactedObligations: [],
      impactedControls: [],
      owner: def.reg === 'GST' ? 'deepa' : def.reg === 'PFRDA' ? 'arvind' : def.reg === 'DPDP' ? 'priya' : def.reg === 'CERT-In' ? 'rajesh' : 'vikram',
      status: i < 8 ? r.pick(['Assessed', 'In progress'] as const) : r.pick(statuses),
      detail: def.detail,
    })
  }
  return changes
}

// ── Data assets (120) + DSARs (14 open) ─────────────────────────────────────
function buildDataAssets(): DataAsset[] {
  const r = new Rand(1200)
  const assets: DataAsset[] = []
  const stores: DataAsset['store'][] = ['CRA', 'KYC DB', 'Fund Accounting', 'CRM']
  const piiAll: DataAsset['piiTypes'] = ['PRAN', 'KYC', 'Nominee', 'Bank', 'Financial']
  for (let i = 0; i < 120; i++) {
    const store = r.pick(stores)
    assets.push({
      id: `DA-${String(i + 1).padStart(3, '0')}`,
      name: `${store} — ${r.pick(['Subscriber master', 'Transaction ledger', 'Nominee register', 'KYC documents', 'Contribution records', 'NAV history', 'Grievance records'])} ${r.pick(NPS_SCHEMES)}/${r.pick(TIERS)}`,
      store,
      piiTypes: r.sample(piiAll, r.int(1, 4)),
      classification: r.weighted<DataAsset['classification']>([['Restricted', 4], ['Confidential', 4], ['Internal', 2]]),
      retentionRule: r.pick(['Retain 10 years (PFRDA)', 'Retain 8 years (Companies Act)', 'Retain till exit + 7 years', 'Retain 180 days (CERT-In logs)']),
      consentStatus: r.weighted<DataAsset['consentStatus']>([['Captured', 6], ['Partial', 2], ['Legacy', 2]]),
      records: r.int(12000, 940000),
    })
  }
  return assets
}

function buildDsars(): Dsar[] {
  const r = new Rand(14)
  const dsars: Dsar[] = []
  // worked erasure-vs-retention case first
  dsars.push({
    id: 'DSAR-2026-0047',
    pran: '110078451293',
    type: 'Erasure',
    raisedAt: iso(new Date(NOW_MS - 5 * 86400000)),
    dueDate: iso(new Date(NOW_MS + 25 * 86400000)),
    status: 'On hold',
    owner: 'priya',
    note: 'Subscriber requests erasure. PFRDA mandates 10-year retention of pension records — erasure withheld for statutory data; marketing/CRM consent revoked and purged. Worked erasure-vs-retention case.',
    step: 4, // located, retention-checked, erased-what-allowed, logged — awaiting audit record + DPO sign-off
  })
  const types: Dsar['type'][] = ['Access', 'Erasure', 'Correction', 'Nomination']
  for (let i = 0; i < 13; i++) {
    const status = r.weighted<Dsar['status']>([['Open', 3], ['In review', 3], ['On hold', 1]])
    dsars.push({
      id: `DSAR-2026-00${48 + i}`,
      pran: `1100${r.int(1000, 9999)}${r.int(1000, 9999)}`,
      type: r.pick(types),
      raisedAt: iso(new Date(NOW_MS - r.int(1, 25) * 86400000)),
      dueDate: iso(new Date(NOW_MS + r.int(3, 28) * 86400000)),
      status,
      owner: 'priya',
      note: r.pick([
        'Access request — compiling data inventory across CRA and KYC stores.',
        'Correction of nominee details pending CRA confirmation.',
        'Nomination update routed to CRA (Protean) interface.',
        'Access request — identity verification completed.',
      ]),
      step: status === 'In review' ? 2 : status === 'On hold' ? 1 : 1,
    })
  }
  return dsars
}

// ── exported world ──────────────────────────────────────────────────────────
const controls = buildControls()

// ── Compliance controls (Sources pipeline) — tracked controls that satisfy
// statutory clauses saved from the Source Library. CTRL-COMP-DPB-01 is shared:
// it satisfies clauses from two acts (DPDP §8(6) + CERT-In 6-hour reporting).
const COMPLIANCE_CONTROLS: Control[] = [
  {
    id: 'CTRL-COMP-DPB-01',
    title: 'Personal-data-breach detection & notification',
    frameworks: ['ISO 27001', 'NIST CSF'],
    mappedFrameworkRefs: [
      { framework: 'ISO 27001', ref: 'A.5.24 (incident management)' },
      { framework: 'NIST CSF', ref: 'RS.CO (Respond — Communications)' },
    ],
    owner: 'priya',
    type: 'Detective',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 12 * 86400000)),
    result: 'Pass',
    evidenceCount: 9,
    linkedRisks: [],
    linkedIssues: [],
    description:
      'Detect a personal-data breach and run one notification runbook to two regulators — intimate the Data Protection Board and affected subscribers within the DPDP window, and report to CERT-In within six hours.',
    frequency: 'Continuous',
    nextDue: daysFromNow(20),
    sourceRefs: ['SRC-DPDP-2025', 'SRC-CERTIN-2022'],
  },
  {
    id: 'CTRL-COMP-SEC-01',
    title: 'Personal-data security safeguards',
    frameworks: ['ISO 27001'],
    mappedFrameworkRefs: [{ framework: 'ISO 27001', ref: 'A.8.24 (cryptography) / A.5.15 (access control)' }],
    owner: 'priya',
    type: 'Preventive',
    automation: 'CCM',
    lastTested: iso(new Date(NOW_MS - 4 * 86400000)),
    result: 'Pass',
    evidenceCount: 14,
    linkedRisks: [],
    linkedIssues: [],
    description: 'Encryption, access control and continuous monitoring over subscriber personal data on the CRA and KYC stores.',
    frequency: 'Continuous',
    nextDue: daysFromNow(20),
    sourceRefs: ['SRC-DPDP-8-5'],
  },
  {
    id: 'CTRL-COMP-INV-01',
    title: 'Investment universe & exposure monitoring',
    frameworks: ['PFRDA ICS'],
    mappedFrameworkRefs: [{ framework: 'PFRDA ICS', ref: 'Investment guidelines — universe & exposure' }],
    owner: 'arvind',
    type: 'Preventive',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 6 * 86400000)),
    result: 'Pass',
    evidenceCount: 7,
    linkedRisks: [],
    linkedIssues: [],
    description: 'Pre-trade approved-universe check and single-issuer / group exposure-limit monitoring on the NPS scheme portfolios, minuted at the Investment Committee.',
    frequency: 'Weekly',
    nextDue: daysFromNow(16),
    sourceRefs: ['SRC-PFRDA-INV-2025', 'SRC-PFRDA-INV-COMMITTEE'],
  },
  {
    // Policy-driven research-review control — frameworks left empty so its seed
    // sourceRefs survive linkSources(), keeping the SRC-PFRDA-INV-REVIEW → CTRL
    // link clean (same convention as the PT / Companies Act source controls).
    id: 'CTRL-COMP-INVRES-01',
    title: 'Investment research review — per-cycle, per-sector documentation',
    frameworks: [],
    mappedFrameworkRefs: [],
    owner: 'arvind',
    type: 'Detective',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 2 * 86400000)),
    result: 'Pass',
    evidenceCount: 16,
    linkedRisks: [],
    linkedIssues: [],
    description:
      'Force and capture a research review per cycle: each of the eight sector analysts files a signed research note for their actively invested holdings twice a week and re-confirms the full PFRDA top-250 universe annually, consolidated and minuted at the Investment Sub-Committee (IISC). Stands up the evidence trail a past PFRDA inspection found missing — reviews were performed but not documented.',
    frequency: 'Twice a week',
    nextDue: daysFromNow(1),
    sourceRefs: ['SRC-PFRDA-INV-REVIEW'],
  },
  {
    id: 'CTRL-COMP-LOG-01',
    title: 'Log retention & NTP time-sync',
    frameworks: ['NIST CSF', 'ISO 27001'],
    mappedFrameworkRefs: [
      { framework: 'NIST CSF', ref: 'PR.PS (Platform Security — logging)' },
      { framework: 'ISO 27001', ref: 'A.8.15 (logging)' },
    ],
    owner: 'karthik',
    type: 'Detective',
    automation: 'CCM',
    lastTested: iso(new Date(NOW_MS - 3 * 86400000)),
    result: 'Pass',
    evidenceCount: 11,
    linkedRisks: [],
    linkedIssues: [],
    description: '180-day in-India log retention across Splunk SIEM and CrowdStrike EDR, with NTP clock synchronisation to NIC/NPL sources.',
    frequency: 'Continuous',
    nextDue: daysFromNow(20),
    sourceRefs: ['SRC-CERTIN-LOGS'],
  },
  {
    id: 'CTRL-COMP-PT-01',
    title: 'Profession-tax deduction, remittance & return',
    frameworks: [],
    mappedFrameworkRefs: [],
    owner: 'farhan',
    type: 'Preventive',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 9 * 86400000)),
    result: 'Pass',
    evidenceCount: 4,
    linkedRisks: [],
    linkedIssues: [],
    description:
      'Deduct Maharashtra profession tax at the Schedule I slab from monthly payroll, deposit it to the State by the statutory date, and file the PT return — PTRC maintained; supports the monthly remittance duty (OBL-LAB-JUN26-02).',
    frequency: 'Monthly',
    nextDue: daysFromNow(20),
    sourceRefs: ['SRC-PT-4', 'SRC-PT-6', 'SRC-PT-8'],
  },
  {
    // frameworks: [] (source-control convention) so its seed sourceRefs survive
    // linkSources() — keeps the s.173/s.177 → CTRL link clean. Covers both the
    // board cadence (s.173) and the Audit Committee (s.177); their signed minutes
    // are evidence and feed the MGT-7 meetings section.
    id: 'CTRL-COMP-CA-01',
    title: 'Board & committee meeting cadence & minutes',
    frameworks: [],
    mappedFrameworkRefs: [],
    owner: 'vikram',
    type: 'Preventive',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 14 * 86400000)),
    result: 'Pass',
    evidenceCount: 6,
    linkedRisks: [],
    linkedIssues: [],
    description: 'Convene the Board (≥4/year, ≤120-day gap, s.173) and the Audit Committee (s.177) on cadence, record and sign the minutes, and preserve them — the minutes double as evidence on the meetings, related-party approvals and the annual return.',
    frequency: 'Quarterly',
    nextDue: daysFromNow(40),
    sourceRefs: ['SRC-CA-173', 'SRC-CA-177'],
  },
  {
    id: 'CTRL-COMP-CA-02',
    title: 'Annual return (MGT-7) & ROC filing control',
    frameworks: [],
    mappedFrameworkRefs: [],
    owner: 'vikram',
    type: 'Preventive',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 9 * 86400000)),
    result: 'Pass',
    evidenceCount: 1,
    linkedRisks: [],
    linkedIssues: [],
    description:
      'Assemble the annual return (Form MGT-7) by pulling members and shareholding from the Register of Members (s.88), board/committee attendance from the signed minutes, and the director/KMP and related-party registers; reconcile, obtain the MGT-8 certificate from a Practising Company Secretary, get the director + CS signatures, file on MCA21 V3 and capture the SRN/challan. The draft is auto-assembled from the live registers in minutes rather than rebuilt by hand.',
    frequency: 'Annual',
    nextDue: daysFromNow(150),
    sourceRefs: ['SRC-CA-92-5', 'SRC-CA-92-2', 'SRC-CA-403'],
  },
  {
    id: 'CTRL-COMP-CA-03',
    title: 'Financial statements (AOC-4) filing control',
    frameworks: [],
    mappedFrameworkRefs: [],
    owner: 'vikram',
    type: 'Preventive',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 11 * 86400000)),
    result: 'Pass',
    evidenceCount: 1,
    linkedRisks: [],
    linkedIssues: [],
    description: 'Prepare and file the financial statements (AOC-4) and related annexures with the ROC; capture filing acknowledgements and the auditors’ sign-off.',
    frequency: 'Annual',
    nextDue: daysFromNow(120),
    sourceRefs: ['SRC-CA-137-3', 'SRC-CA-403'],
  },
  {
    id: 'CTRL-COMP-CA-04',
    title: 'ROC filing health & director-disqualification monitoring',
    frameworks: [],
    mappedFrameworkRefs: [],
    owner: 'vikram',
    type: 'Preventive',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 18 * 86400000)),
    result: 'Pass',
    evidenceCount: 1,
    linkedRisks: [],
    linkedIssues: [],
    description:
      'Monitor the health of MGT-7 and AOC-4 ROC filings and ensure the company does not enter a continuous default condition that would trigger director disqualification under Section 164(2).',
    frequency: 'Quarterly',
    nextDue: daysFromNow(20),
    sourceRefs: ['SRC-CA-164-2', 'SRC-CA-92-5', 'SRC-CA-137-3'],
  },
  {
    id: 'CTRL-COMP-CA-05',
    title: 'Statutory registers (s.88) upkeep',
    frameworks: [],
    mappedFrameworkRefs: [],
    owner: 'vikram',
    type: 'Preventive',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 21 * 86400000)),
    result: 'Pass',
    evidenceCount: 3,
    linkedRisks: [],
    linkedIssues: [],
    description: 'Maintain the Register of Members (MGT-1), Register of Debenture-holders (MGT-2) and index, updated on every change — the single source the annual return (MGT-7) is assembled from.',
    frequency: 'Continuous',
    nextDue: daysFromNow(45),
    sourceRefs: ['SRC-CA-88'],
  },
  {
    id: 'CTRL-COMP-CA-06',
    title: 'Related-party transactions approval & register',
    frameworks: [],
    mappedFrameworkRefs: [],
    owner: 'vikram',
    type: 'Preventive',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 16 * 86400000)),
    result: 'Pass',
    evidenceCount: 4,
    linkedRisks: [],
    linkedIssues: [],
    description: 'Route every related-party transaction through Audit Committee approval (Board/shareholder approval beyond thresholds), disclose it in the Board report and record it in the register of contracts (MBP-4) — the Audit Committee minutes are the evidence.',
    frequency: 'Quarterly',
    nextDue: daysFromNow(35),
    sourceRefs: ['SRC-CA-188'],
  },
  {
    id: 'CTRL-COMP-CA-07',
    title: 'Director declarations (MBP-1 / DIR-8)',
    frameworks: [],
    mappedFrameworkRefs: [],
    owner: 'vikram',
    type: 'Preventive',
    automation: 'Manual',
    lastTested: iso(new Date(NOW_MS - 19 * 86400000)),
    result: 'Pass',
    evidenceCount: 2,
    linkedRisks: [],
    linkedIssues: [],
    description: 'Collect the annual MBP-1 disclosure of interest and the DIR-8 declaration of non-disqualification from every director at the first Board meeting of the year — feeding the related-party (s.188) and disqualification (s.164) checks.',
    frequency: 'Annual',
    nextDue: daysFromNow(55),
    sourceRefs: ['SRC-CA-184'],
  },
]
controls.push(...COMPLIANCE_CONTROLS)

const risks = buildRisks(controls)
const incidents = buildIncidents()
const obligations = buildObligations()
const policies = buildPolicies(controls)
// The firm's board-approved Investment Research & Review Policy — the proximate
// source for the policy-driven research-review chain (slot 0 of the proof chain
// for OBL-INT-INVRES-*). It maps the research-review control; no other policy is
// allowed to claim that control, so policyForControl() resolves here deterministically.
policies.push({
  id: 'POL-046',
  title: 'Investment Research & Review Policy',
  version: 'v2.1',
  owner: 'arvind',
  approvedBy: 'meera',
  approvedOn: iso(new Date(NOW_MS - 95 * 86400000)),
  nextReview: iso(new Date(NOW_MS + 270 * 86400000)),
  mappedControls: ['CTRL-COMP-INVRES-01'],
  status: 'Published',
  category: 'Investment',
})
for (const p of policies) {
  if (p.id !== 'POL-046') p.mappedControls = p.mappedControls.filter((c) => c !== 'CTRL-COMP-INVRES-01')
}
const issues = buildIssues(controls, incidents)
const evidence = buildEvidence(controls, obligations)
const audits = buildAudits()
const regChanges = buildRegChanges()
const dataAssets = buildDataAssets()
const dsars = buildDsars()

// Curated, named evidence pinned to the worked demo records so their Evidence tabs
// show relevant proof (not just the random pool). The cross-link pass below pushes
// each item's linkedObligations into that obligation's evidence list automatically.
const CURATED_EVIDENCE: Evidence[] = [
  // Maharashtra profession-tax chain (CTRL-COMP-PT-01 / OBL-LAB-JUN26-02)
  { id: 'EVD-44600', title: 'PTRC registration certificate — Maharashtra', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 210 * 86400000)), capturedBy: 'farhan', auto: false, linkedControls: ['CTRL-COMP-PT-01'], linkedObligations: [], frameworkRefs: [], source: 'Manual upload' },
  { id: 'EVD-44601', title: 'Monthly PT challan — payment acknowledgement (May 2026)', type: 'Filing ack', capturedAt: iso(new Date(NOW_MS - 26 * 86400000)), capturedBy: 'farhan', auto: false, linkedControls: ['CTRL-COMP-PT-01'], linkedObligations: ['OBL-LAB-JUN26-02'], frameworkRefs: [], source: 'mahagst portal' },
  { id: 'EVD-44602', title: 'PT return filing acknowledgement', type: 'Filing ack', capturedAt: iso(new Date(NOW_MS - 24 * 86400000)), capturedBy: 'farhan', auto: false, linkedControls: ['CTRL-COMP-PT-01'], linkedObligations: ['OBL-LAB-JUN26-02'], frameworkRefs: [], source: 'mahagst portal' },
  { id: 'EVD-44603', title: 'Payroll PT deduction register — Schedule I slabs', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 25 * 86400000 - 4200000)), capturedBy: 'farhan', auto: false, linkedControls: ['CTRL-COMP-PT-01'], linkedObligations: ['OBL-LAB-JUN26-02'], frameworkRefs: [], source: 'Payroll system' },
  { id: 'EVD-44607', title: 'Payroll PT deduction register — current cycle (Schedule I slabs)', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 1 * 86400000)), capturedBy: 'farhan', auto: false, linkedControls: ['CTRL-COMP-PT-01'], linkedObligations: ['OBL-LAB-JUN26-04'], frameworkRefs: [], source: 'Payroll system' },
  // DPDP worked controls
  { id: 'EVD-44604', title: 'Breach-notification runbook — CERT-In 6h + DPDP Board', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 12 * 86400000)), capturedBy: 'priya', auto: false, linkedControls: ['CTRL-COMP-DPB-01'], linkedObligations: [], frameworkRefs: ['ISO 27001', 'NIST CSF'], source: 'Manual upload' },
  { id: 'EVD-44605', title: 'KYC-store encryption & access-control config export', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 4 * 86400000 - 1800000)), capturedBy: 'CCM (auto)', auto: true, linkedControls: ['CTRL-COMP-SEC-01'], linkedObligations: [], frameworkRefs: ['ISO 27001'], source: 'AWS Security Hub' },
  { id: 'EVD-44606', title: 'Consent ledger reconciliation — Q1 FY2026-27', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 9 * 86400000)), capturedBy: 'anjali', auto: false, linkedControls: ['CTRL-COMP-DPB-01'], linkedObligations: ['OBL-DPDP-JUN26-01'], frameworkRefs: [], source: 'Consent & Privacy platform' },
  // Investment Research & Review chain (CTRL-COMP-INVRES-01 / OBL-INT-INVRES-*).
  // Per-sector research notes for the live cycle, the prior cycle's IISC minutes
  // (audit-ready), the annual universe pack, the policy sign-off, and the pack
  // submitted to the ongoing Investment Operations audit.
  { id: 'EVD-44620', title: 'Research review note — Banking & Financials (active holdings, current cycle)', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 14 * 3600000)), capturedBy: 'aditya', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: ['OBL-INT-INVRES-W1'], frameworkRefs: [], source: 'Research desk' },
  { id: 'EVD-44621', title: 'Research review note — IT & Technology (active holdings, current cycle)', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 12 * 3600000)), capturedBy: 'sneha', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: ['OBL-INT-INVRES-W1'], frameworkRefs: [], source: 'Research desk' },
  { id: 'EVD-44622', title: 'Research review note — Pharma & Healthcare (active holdings, current cycle)', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 9 * 3600000)), capturedBy: 'rahul', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: ['OBL-INT-INVRES-W1'], frameworkRefs: [], source: 'Research desk' },
  { id: 'EVD-44623', title: 'Research review note — FMCG & Consumer (active holdings, current cycle)', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 6 * 3600000)), capturedBy: 'pooja', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: ['OBL-INT-INVRES-W1'], frameworkRefs: [], source: 'Research desk' },
  { id: 'EVD-44624', title: 'IISC minutes — active-holdings research review (prior bi-weekly cycle)', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 3 * 86400000)), capturedBy: 'arvind', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: ['OBL-INT-INVRES-PREVW'], frameworkRefs: [], source: 'Investment Sub-Committee (IISC)' },
  { id: 'EVD-44625', title: 'Consolidated sector research-note pack (all 8 sectors) — prior cycle', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 3 * 86400000 - 6 * 3600000)), capturedBy: 'arvind', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: ['OBL-INT-INVRES-PREVW'], frameworkRefs: [], source: 'Research desk' },
  { id: 'EVD-44626', title: 'Top-250 universe annual research-review pack (FY2025-26)', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 11 * 86400000)), capturedBy: 'sanjay', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: ['OBL-INT-INVRES-FY'], frameworkRefs: [], source: 'Research desk' },
  { id: 'EVD-44627', title: 'IISC minutes — annual top-250 universe review', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 10 * 86400000)), capturedBy: 'arvind', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: ['OBL-INT-INVRES-FY'], frameworkRefs: [], source: 'Investment Sub-Committee (IISC)' },
  { id: 'EVD-44628', title: 'Audit evidence pack — investment research reviews (IISC minutes + per-cycle notes)', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 2 * 86400000)), capturedBy: 'lakshmi', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: [], frameworkRefs: [], source: 'Internal Audit (AUD-INT-2026-04)' },
  { id: 'EVD-44629', title: 'Board-approved Investment Research & Review Policy v2.1 — sign-off', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 95 * 86400000)), capturedBy: 'arvind', auto: false, linkedControls: ['CTRL-COMP-INVRES-01'], linkedObligations: [], frameworkRefs: [], source: 'Board pack' },
]
evidence.push(...CURATED_EVIDENCE)

// Companies Act curated evidence: filing acks and board minutes
const CA_CURATED: Evidence[] = [
  { id: 'EVD-44610', title: 'MGT-7 filing acknowledgement — FY26', type: 'Filing ack', capturedAt: iso(new Date(NOW_MS - 26 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-02'], linkedObligations: ['OBL-CA-FY26-03'], frameworkRefs: [], source: 'MCA portal' },
  { id: 'EVD-44611', title: 'AOC-4 filing acknowledgement — FY26', type: 'Filing ack', capturedAt: iso(new Date(NOW_MS - 30 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-03'], linkedObligations: ['OBL-CA-FY26-04'], frameworkRefs: [], source: 'MCA portal' },
  { id: 'EVD-44612', title: 'Signed Board minutes — Q1 FY26', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 40 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-01'], linkedObligations: ['OBL-CA-FY26-05'], frameworkRefs: [], source: 'Board pack' },
  { id: 'EVD-44613', title: 'ROC filing health attestation', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 15 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-04'], linkedObligations: ['OBL-CA-FY26-05'], frameworkRefs: [], source: 'Company secretary' },
  // ── Annual return (MGT-7) worked chain — the real filing artifacts, in order:
  // draft auto-assembled from the registers → reconciled list of shareholders →
  // MGT-8 PCS certificate → signed return → MCA21 SRN/challan acknowledgement.
  // Completed FY2025-26 cycle (OBL-CA-FY26-03):
  { id: 'EVD-44640', title: 'MGT-7 draft — auto-assembled from the statutory registers (FY2025-26)', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 34 * 86400000)), capturedBy: 'CCM (auto)', auto: true, linkedControls: ['CTRL-COMP-CA-02'], linkedObligations: ['OBL-CA-FY26-03'], frameworkRefs: [], source: 'OneGRC secretarial automation' },
  { id: 'EVD-44641', title: 'List of shareholders & shareholding pattern — reconciled to Register of Members (MGT-1)', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 33 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-02', 'CTRL-COMP-CA-05'], linkedObligations: ['OBL-CA-FY26-03'], frameworkRefs: [], source: 'Statutory registers' },
  { id: 'EVD-44642', title: 'MGT-8 — certificate of a Practising Company Secretary', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 29 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-02'], linkedObligations: ['OBL-CA-FY26-03'], frameworkRefs: [], source: 'Practising Company Secretary' },
  { id: 'EVD-44643', title: 'Signed annual return (MGT-7) — director + Company Secretary', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 27 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-02'], linkedObligations: ['OBL-CA-FY26-03'], frameworkRefs: [], source: 'Board pack' },
  { id: 'EVD-44644', title: 'MCA21 filing acknowledgement — SRN + challan (MGT-7, FY2025-26)', type: 'Filing ack', capturedAt: iso(new Date(NOW_MS - 26 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-02'], linkedObligations: ['OBL-CA-FY26-03'], frameworkRefs: [], source: 'MCA21 V3 portal' },
  // In-flight FY2026-27 cycle (OBL-CA-FY27-AR) — draft assembled, certification/sign/file pending:
  { id: 'EVD-44645', title: 'MGT-7 draft — auto-assembled from the statutory registers (FY2026-27)', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 2 * 86400000)), capturedBy: 'CCM (auto)', auto: true, linkedControls: ['CTRL-COMP-CA-02'], linkedObligations: ['OBL-CA-FY27-AR'], frameworkRefs: [], source: 'OneGRC secretarial automation' },
  { id: 'EVD-44646', title: 'List of shareholders & shareholding pattern — reconciled (FY2026-27)', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 1 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-02', 'CTRL-COMP-CA-05'], linkedObligations: ['OBL-CA-FY27-AR'], frameworkRefs: [], source: 'Statutory registers' },
  // Other secretarial-calendar artifacts (registers, declarations, related-party):
  { id: 'EVD-44647', title: 'Register of Members (MGT-1) — current extract', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 6 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-05'], linkedObligations: ['OBL-CA-FY26-08'], frameworkRefs: [], source: 'Statutory registers' },
  { id: 'EVD-44648', title: 'MBP-1 & DIR-8 declarations — all directors (FY2026-27)', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 41 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-07'], linkedObligations: ['OBL-CA-FY26-06'], frameworkRefs: [], source: 'Board pack' },
  { id: 'EVD-44649', title: 'Register of contracts (MBP-4) — related-party transactions', type: 'Config export', capturedAt: iso(new Date(NOW_MS - 12 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-06'], linkedObligations: ['OBL-CA-FY26-07'], frameworkRefs: [], source: 'Statutory registers' },
  { id: 'EVD-44650', title: 'Audit Committee minutes — related-party approvals (Q1 FY2026-27)', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 13 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-06', 'CTRL-COMP-CA-01'], linkedObligations: ['OBL-CA-FY26-07'], frameworkRefs: [], source: 'Audit Committee' },
  // Representative artifacts the historical generated CA cycles attach to (set in the
  // CA evidence-cleanup pass below) so their tasks show the right proof, not a random log.
  { id: 'EVD-44651', title: 'Signed Board minutes — board meeting', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 38 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-01'], linkedObligations: [], frameworkRefs: [], source: 'Board pack' },
  { id: 'EVD-44652', title: 'Audit Committee minutes', type: 'Attestation', capturedAt: iso(new Date(NOW_MS - 37 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-01'], linkedObligations: [], frameworkRefs: [], source: 'Audit Committee' },
  { id: 'EVD-44653', title: 'MGT-7 filing acknowledgement — MCA21 SRN', type: 'Filing ack', capturedAt: iso(new Date(NOW_MS - 36 * 86400000)), capturedBy: 'vikram', auto: false, linkedControls: ['CTRL-COMP-CA-02'], linkedObligations: [], frameworkRefs: [], source: 'MCA21 V3 portal' },
]
evidence.push(...CA_CURATED)

// Companies Act obligations: explicit ROC filing obligation (worked example)
const CA_OBLIGATIONS: Obligation[] = [
  {
    // Completed FY2025-26 annual return — the full worked filing trail. Five
    // sub-step tasks: auto-assemble the draft from the registers → reconcile the
    // shareholder list → MGT-8 PCS certification → director + CS signing → file on
    // MCA21 and capture the SRN. The draft is auto-assembled from the live
    // registers, cutting the prep that was previously rebuilt by hand each year.
    id: 'OBL-CA-FY26-03',
    regulator: 'Companies Act' as const,
    title: 'Annual return MGT-7 filing',
    frequency: 'Annual',
    dueDate: iso(new Date(NOW_MS - 26 * 86400000)),
    owner: 'vikram',
    status: 'Filed',
    makerChecker: { maker: 'vikram', checker: 'meera', state: 'Approved' },
    evidence: ['EVD-44640', 'EVD-44641', 'EVD-44642', 'EVD-44643', 'EVD-44644'],
    reference: 'MGT-7',
    sourceRefs: ['SRC-CA-92-5', 'SRC-CA-92-2', 'SRC-CA-403'],
    requirement: 'File the annual return in Form MGT-7 (with the MGT-8 PCS certificate) with the Registrar of Companies within 60 days of the AGM.',
    applicability: 'Section 92 of the Companies Act requires SPF to file its annual return; SPF crosses the MGT-8 threshold so a PCS certificate is required; delay attracts a per-day additional fee (s.403).',
    origin: 'External',
    filedAt: iso(new Date(NOW_MS - 26 * 86400000)),
    subSteps: [
      { id: 'OBL-CA-FY26-03-S1', seq: 1, title: 'Auto-assemble the MGT-7 draft from the statutory registers (members, shareholding, board/committee attendance, KMP, related-party)', clauseRef: 'SRC-CA-92-2', maker: 'vikram', checker: 'farhan', dueDate: iso(new Date(NOW_MS - 34 * 86400000)), status: 'Done', evidenceId: 'EVD-44640' },
      { id: 'OBL-CA-FY26-03-S2', seq: 2, title: 'Reconcile the list of shareholders & shareholding pattern to the Register of Members (s.88)', clauseRef: 'SRC-CA-88', maker: 'farhan', checker: 'vikram', dueDate: iso(new Date(NOW_MS - 33 * 86400000)), status: 'Done', evidenceId: 'EVD-44641', dependsOnSeq: 1 },
      { id: 'OBL-CA-FY26-03-S3', seq: 3, title: 'Obtain the MGT-8 certificate from the Practising Company Secretary', clauseRef: 'SRC-CA-92-2', maker: 'vikram', checker: 'meera', dueDate: iso(new Date(NOW_MS - 29 * 86400000)), status: 'Done', evidenceId: 'EVD-44642', dependsOnSeq: 2 },
      { id: 'OBL-CA-FY26-03-S4', seq: 4, title: 'Digitally sign the annual return (a director and the Company Secretary)', clauseRef: 'SRC-CA-92-5', maker: 'vikram', checker: 'meera', dueDate: iso(new Date(NOW_MS - 27 * 86400000)), status: 'Done', evidenceId: 'EVD-44643', dependsOnSeq: 3 },
      { id: 'OBL-CA-FY26-03-S5', seq: 5, title: 'File MGT-7 on MCA21 V3 and capture the SRN + challan acknowledgement', clauseRef: 'SRC-CA-92-5', maker: 'vikram', checker: 'farhan', dueDate: iso(new Date(NOW_MS - 26 * 86400000)), status: 'Done', evidenceId: 'EVD-44644', dependsOnSeq: 4 },
    ],
  },
  {
    // In-flight FY2026-27 annual return — central tracking of the 60-day post-AGM
    // clock. Draft already auto-assembled and reconciled; MGT-8 certification,
    // signing and filing still pending.
    id: 'OBL-CA-FY27-AR',
    regulator: 'Companies Act' as const,
    title: 'Annual return MGT-7 filing',
    frequency: 'Annual',
    dueDate: daysFromNow(38),
    owner: 'vikram',
    status: 'In review',
    makerChecker: { maker: 'vikram', checker: 'meera', state: 'Submitted' },
    evidence: ['EVD-44645', 'EVD-44646'],
    reference: 'MGT-7',
    sourceRefs: ['SRC-CA-92-5', 'SRC-CA-92-2', 'SRC-CA-403'],
    requirement: 'File the annual return in Form MGT-7 (with the MGT-8 PCS certificate) with the Registrar of Companies within 60 days of the AGM.',
    applicability: 'Section 92 of the Companies Act requires SPF to file its annual return; delay attracts a per-day additional fee (s.403).',
    origin: 'External',
    subSteps: [
      { id: 'OBL-CA-FY27-AR-S1', seq: 1, title: 'Auto-assemble the MGT-7 draft from the statutory registers', clauseRef: 'SRC-CA-92-2', maker: 'vikram', checker: 'farhan', dueDate: iso(new Date(NOW_MS - 2 * 86400000)), status: 'Done', evidenceId: 'EVD-44645' },
      { id: 'OBL-CA-FY27-AR-S2', seq: 2, title: 'Reconcile the list of shareholders & shareholding pattern to the Register of Members (s.88)', clauseRef: 'SRC-CA-88', maker: 'farhan', checker: 'vikram', dueDate: iso(new Date(NOW_MS - 1 * 86400000)), status: 'Done', evidenceId: 'EVD-44646', dependsOnSeq: 1 },
      { id: 'OBL-CA-FY27-AR-S3', seq: 3, title: 'Obtain the MGT-8 certificate from the Practising Company Secretary', clauseRef: 'SRC-CA-92-2', maker: 'vikram', checker: 'meera', dueDate: daysFromNow(20), status: 'Pending', dependsOnSeq: 2 },
      { id: 'OBL-CA-FY27-AR-S4', seq: 4, title: 'Digitally sign the annual return (a director and the Company Secretary)', clauseRef: 'SRC-CA-92-5', maker: 'vikram', checker: 'meera', dueDate: daysFromNow(30), status: 'Pending', dependsOnSeq: 3 },
      { id: 'OBL-CA-FY27-AR-S5', seq: 5, title: 'File MGT-7 on MCA21 V3 and capture the SRN + challan acknowledgement', clauseRef: 'SRC-CA-92-5', maker: 'vikram', checker: 'farhan', dueDate: daysFromNow(38), status: 'Pending', dependsOnSeq: 4 },
    ],
  },
  {
    id: 'OBL-CA-FY26-04',
    regulator: 'Companies Act' as const,
    title: 'Financial statements AOC-4 filing',
    frequency: 'Annual',
    dueDate: iso(new Date(NOW_MS + 90 * 86400000)),
    owner: 'vikram',
    status: 'In review',
    makerChecker: { maker: 'vikram', checker: 'farhan', state: 'Submitted' },
    evidence: ['EVD-44611'],
    reference: 'AOC-4',
    sourceRefs: ['SRC-CA-137-3', 'SRC-CA-403'],
    requirement: 'File the financial statements (AOC-4) with the Registrar of Companies and attach auditor sign-off.',
    applicability: 'SPF files financial statements with the ROC under Section 137(3).',
    origin: 'External',
  },
  {
    id: 'OBL-CA-FY26-05',
    regulator: 'Companies Act' as const,
    title: 'ROC filing health review',
    frequency: 'Quarterly',
    dueDate: iso(new Date(NOW_MS + 30 * 86400000)),
    owner: 'vikram',
    status: 'In review',
    makerChecker: { maker: 'vikram', checker: 'farhan', state: 'Submitted' },
    evidence: ['EVD-44613'],
    reference: 'CA-2013-164',
    sourceRefs: ['SRC-CA-164-2', 'SRC-CA-92-5', 'SRC-CA-137-3'],
    requirement: 'Review ROC filing health and escalation readiness for continuous filing defaults that could trigger director disqualification under Section 164(2).',
    applicability: 'Maintains a monitoring obligation for Section 164(2) even though the disqualification condition has not occurred.',
    origin: 'Internal',
  },
  // Other secretarial-calendar duties — director declarations (s.184/164),
  // related-party transactions (s.188) and statutory registers (s.88). Statuses
  // are Filed / In review so they do not disturb the curated due/overdue anchors.
  {
    id: 'OBL-CA-FY26-06',
    regulator: 'Companies Act' as const,
    title: 'Director declarations (MBP-1 & DIR-8)',
    frequency: 'Annual',
    dueDate: iso(new Date(NOW_MS - 41 * 86400000)),
    owner: 'vikram',
    status: 'Filed',
    makerChecker: { maker: 'vikram', checker: 'meera', state: 'Approved' },
    evidence: ['EVD-44648'],
    reference: 'MBP-1/DIR-8',
    sourceRefs: ['SRC-CA-184'],
    requirement: 'Collect every director’s MBP-1 disclosure of interest and DIR-8 declaration of non-disqualification at the first Board meeting of the year.',
    applicability: 'Section 184 r/w 164(2) requires each SPF director to declare interest and non-disqualification annually.',
    origin: 'External',
    filedAt: iso(new Date(NOW_MS - 41 * 86400000)),
  },
  {
    id: 'OBL-CA-FY26-07',
    regulator: 'Companies Act' as const,
    title: 'Related-party transactions (s.188) — approval & MBP-4 register',
    frequency: 'Quarterly',
    dueDate: daysFromNow(20),
    owner: 'vikram',
    status: 'In review',
    makerChecker: { maker: 'vikram', checker: 'sunita', state: 'Submitted' },
    evidence: ['EVD-44649', 'EVD-44650'],
    reference: 'CA-2013-188',
    sourceRefs: ['SRC-CA-188'],
    requirement: 'Route related-party transactions through Audit Committee approval, disclose them and record them in the register of contracts (MBP-4).',
    applicability: 'SPF is a wholly-owned subsidiary of Sankalp Bank; its related-party dealings need Section 188 approval and disclosure.',
    origin: 'External',
  },
  {
    id: 'OBL-CA-FY26-08',
    regulator: 'Companies Act' as const,
    title: 'Statutory registers under Section 88',
    frequency: 'Continuous',
    dueDate: iso(new Date(NOW_MS - 6 * 86400000)),
    owner: 'vikram',
    status: 'Filed',
    makerChecker: { maker: 'vikram', checker: 'farhan', state: 'Approved' },
    evidence: ['EVD-44647'],
    reference: 'MGT-1/MGT-2',
    sourceRefs: ['SRC-CA-88'],
    requirement: 'Maintain the Register of Members (MGT-1), Register of Debenture-holders (MGT-2) and index, updated on every change — the source the annual return is assembled from.',
    applicability: 'Section 88 requires SPF to maintain the statutory registers; they feed the MGT-7 annual return.',
    origin: 'External',
    filedAt: iso(new Date(NOW_MS - 6 * 86400000)),
  },
]
obligations.push(...CA_OBLIGATIONS)

// ── Multi-step (deduction-type) obligation curation (enhancement plan 3) ──────
// Professional-tax remittance is satisfied by a sequence of actions across two
// departments: HR & Labour deducts (s.4) and files the return (s.6); Finance &
// Tax deposits the tax (s.8). Each action is its own maker-checker task with
// evidence. OBL-LAB-JUN26-04 is the live (in-progress) worked example; -02 is the
// completed prior cycle for contrast.
function curatePtSubSteps() {
  const mk = (
    oblId: string,
    dueMs: number,
    steps: { seq: number; title: string; clause: string; maker: string; checker: string; offsetDays: number; status: ObligationSubStep['status']; ev?: string; dep?: number }[],
  ): ObligationSubStep[] =>
    steps.map((s) => ({
      id: `${oblId}-S${s.seq}`,
      seq: s.seq,
      title: s.title,
      clauseRef: s.clause,
      maker: s.maker,
      checker: s.checker,
      dueDate: new Date(dueMs + s.offsetDays * 86400000).toISOString(),
      status: s.status,
      evidenceId: s.ev,
      dependsOnSeq: s.dep,
    }))

  const live = obligations.find((o) => o.id === 'OBL-LAB-JUN26-04')
  if (live) {
    live.dueDate = daysFromNow(4)
    live.status = 'Due'
    live.makerChecker = { maker: 'farhan', checker: 'anjali', state: 'Drafted' }
    live.sourceRefs = ['SRC-PT-4', 'SRC-PT-6', 'SRC-PT-8']
    live.subSteps = mk('OBL-LAB-JUN26-04', new Date(live.dueDate).getTime(), [
      { seq: 1, title: 'Deduct profession tax from payroll (Schedule I slabs)', clause: 'SRC-PT-4', maker: 'farhan', checker: 'deepa', offsetDays: -4, status: 'Done', ev: 'EVD-44607' },
      { seq: 2, title: 'Deposit profession tax with the State (PT challan)', clause: 'SRC-PT-8', maker: 'deepa', checker: 'anjali', offsetDays: -1, status: 'Pending', dep: 1 },
      { seq: 3, title: 'File the monthly PT return', clause: 'SRC-PT-6', maker: 'farhan', checker: 'vikram', offsetDays: 0, status: 'Pending', dep: 2 },
    ])
  }

  const prior = obligations.find((o) => o.id === 'OBL-LAB-JUN26-02')
  if (prior) {
    prior.sourceRefs = ['SRC-PT-4', 'SRC-PT-6', 'SRC-PT-8']
    // Worked example: this cycle was filed two days before its due date — on time.
    prior.filedAt = iso(new Date(new Date(prior.dueDate).getTime() - 2 * 86400000))
    prior.subSteps = mk('OBL-LAB-JUN26-02', new Date(prior.dueDate).getTime(), [
      { seq: 1, title: 'Deduct profession tax from payroll (Schedule I slabs)', clause: 'SRC-PT-4', maker: 'farhan', checker: 'deepa', offsetDays: -4, status: 'Done', ev: 'EVD-44603' },
      { seq: 2, title: 'Deposit profession tax with the State (PT challan)', clause: 'SRC-PT-8', maker: 'deepa', checker: 'anjali', offsetDays: -1, status: 'Done', ev: 'EVD-44601', dep: 1 },
      { seq: 3, title: 'File the monthly PT return', clause: 'SRC-PT-6', maker: 'farhan', checker: 'vikram', offsetDays: 0, status: 'Done', ev: 'EVD-44602', dep: 2 },
    ])
  }
}
curatePtSubSteps()

// ── Upcoming statutory filings — the forward compliance calendar ──────────────
// A scan across SPF's recurring statutory instruments — the CGST Act (GSTR-1 /
// GSTR-3B), the EPF & MP Act (PF/ESI), the State Profession Tax Act, CERT-In
// Direction 20(3)/2022, the DPDP framework, the PFRDA ICS & Investment
// guidelines and the Companies Act — projecting each cadence forward onto the
// two upcoming filing months so the compliance calendar is never blank ahead of
// "now" (the world is anchored to an evergreen load-time NOW). Each duty sits on
// the real statutory due-day of its month and carries its act reference; the
// crossLink()/linkSources() passes below then map every one onto the proof chain
// (SRC clause → control → obligation → task → evidence) exactly like the seeded
// set, so a forward-dated GSTR-3B opens its CGST clause, control and tasks too.
function buildUpcomingFilings() {
  const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const nowShift = new Date(NOW_MS + (5 * 60 + 30) * 60000) // IST parts of NOW
  const curY = nowShift.getUTCFullYear()
  const curM = nowShift.getUTCMonth()

  // Indian financial year (Apr–Mar) for a calendar month, e.g. Jun 2026 → FY2026-27.
  const fyLabel = (y: number, m: number) => {
    const startY = m >= 3 ? y : y - 1
    return `FY${startY}-${String((startY + 1) % 100).padStart(2, '0')}`
  }
  // Reporting quarter (Apr–Jun = Q1, …) a calendar month falls in.
  const quarterLabel = (y: number, m: number) => `Q${Math.floor(((m - 3 + 12) % 12) / 3) + 1} ${fyLabel(y, m)}`
  const halfLabel = (y: number, m: number) => `${m >= 3 && m <= 8 ? 'H1' : 'H2'} ${fyLabel(y, m)}`

  // Calendar context for the k-th upcoming month (k = 1 → next month). `period*`
  // describe the month/quarter being reported (one month back from the filing).
  const monthCtx = (k: number) => {
    const mIdx = curM + k
    const y = curY + Math.floor(mIdx / 12)
    const m = ((mIdx % 12) + 12) % 12
    const pIdx = m - 1
    const pY = pIdx < 0 ? y - 1 : y
    const pM = (pIdx + 12) % 12
    return {
      y,
      m,
      monyy: `${MON3[m]}${String(y).slice(2)}`,
      periodLabel: `${MONF[pM]} ${pY}`,
      rptQuarter: quarterLabel(pY, pM),
      rptHalf: halfLabel(pY, pM),
      dim: new Date(Date.UTC(y, m + 1, 0)).getUTCDate(),
    }
  }

  const obls: Obligation[] = []
  const evs: Evidence[] = []
  const mk = (
    code: string, monyy: string, stem: string, reg: Regulator, title: string, freq: string,
    ref: string, owner: string, checker: string, y: number, m: number, dueDay: number, dim: number,
    requirement: string, applicability: string, state: Obligation['makerChecker']['state'] = 'Drafted',
  ): Obligation => ({
    id: `OBL-${code}-${monyy}-${stem}`,
    regulator: reg,
    title,
    frequency: freq,
    dueDate: iso(ist(y, m + 1, Math.min(dueDay, dim), 18, 30)),
    owner,
    status: 'Due',
    makerChecker: { maker: owner, checker, state },
    evidence: [],
    reference: ref,
    requirement,
    applicability,
    origin: 'External',
  })

  // Monthly cadence — emitted for each of the two upcoming filing months.
  type Monthly = { code: string; stem: string; reg: Regulator; title: string; ref: string; owner: string; checker: string; dueDay: number; requirement: string; applicability: string }
  const MONTHLY: Monthly[] = [
    { code: 'GST', stem: 'R1', reg: 'GST', title: 'GSTR-1 outward supplies', ref: 'GSTR-1', owner: 'deepa', checker: 'anjali', dueDay: 11, requirement: 'File the monthly GSTR-1 statement of outward supplies (management/advisory fees) by the due date.', applicability: 'SPF is a GST-registered person and must report outward supplies under Section 37 / Section 39 of the CGST Act, 2017.' },
    { code: 'GST', stem: 'R2', reg: 'GST', title: 'GSTR-3B monthly return', ref: 'GSTR-3B', owner: 'deepa', checker: 'anjali', dueDay: 20, requirement: 'File the monthly GSTR-3B summary return and discharge the net tax liability by the due date.', applicability: 'SPF is a GST-registered person and must furnish GSTR-3B under Section 39 of the CGST Act, 2017.' },
    { code: 'LAB', stem: 'R1', reg: 'Labour', title: 'PF & ESI monthly challan', ref: 'EPFO', owner: 'farhan', checker: 'anjali', dueDay: 15, requirement: 'Remit employee/employer provident-fund contributions via the monthly ECR challan by the statutory due date.', applicability: 'SPF is a covered establishment under the EPF & MP Act, 1952; late deposit attracts damages (s.14B) and interest (s.7Q).' },
    { code: 'LAB', stem: 'R2', reg: 'Labour', title: 'Professional tax remittance', ref: 'PT', owner: 'farhan', checker: 'vikram', dueDay: 21, requirement: 'Deduct and remit state professional tax on employee salaries and file the periodic PT return.', applicability: 'SPF employs staff in states levying professional tax and must deduct and deposit it as an employer.' },
    { code: 'CERTIN', stem: 'R1', reg: 'CERT-In', title: 'Cyber incident summary report', ref: '20(3)/2022', owner: 'karthik', checker: 'rajesh', dueDay: 5, requirement: 'Report cyber incidents to CERT-In within six hours of detection and provide the periodic incident summary.', applicability: 'As a body corporate operating ICT systems in India, SPF is bound by CERT-In Direction 20(3)/2022.' },
    { code: 'PFRDA', stem: 'R1', reg: 'PFRDA', title: 'Monthly NAV & AUM statement', ref: 'PFRDA-NAV', owner: 'arvind', checker: 'meera', dueDay: 7, requirement: 'Submit the monthly scheme-wise NAV and AUM statement to PFRDA and the NPS Trust, reconciled to the CRA records.', applicability: 'SPF manages NPS Scheme E/C/G/A across Tier I & II and must report scheme NAV/AUM as a PFM.' },
    { code: 'DPDP', stem: 'R1', reg: 'DPDP', title: 'DSAR fulfilment status report', ref: 'DPDP-Rules-2025', owner: 'priya', checker: 'anjali', dueDay: 5, requirement: 'Track and report Data Principal request (access/correction/erasure) fulfilment within the prescribed timelines.', applicability: 'As a Data Fiduciary, SPF must honour Data Principal rights for subscriber personal data under the DPDP framework.' },
  ]

  for (let k = 1; k <= 2; k++) {
    const c = monthCtx(k)
    for (const d of MONTHLY) {
      obls.push(mk(d.code, c.monyy, d.stem, d.reg, `${d.title} — ${c.periodLabel}`, 'Monthly', d.ref, d.owner, d.checker, c.y, c.m, d.dueDay, c.dim, d.requirement, d.applicability))
    }
  }

  // Quarterly / periodic cadence — placed in the month it actually falls due.
  const m1 = monthCtx(1)
  const m2 = monthCtx(2)
  obls.push(
    mk('PFRDA', m1.monyy, 'Q1c', 'PFRDA', `Quarterly compliance return (Annexure) — ${m1.rptQuarter}`, 'Quarterly', 'PFRDA/2025/05/ICS/01', 'anjali', 'meera', m1.y, m1.m, 15, m1.dim, 'File the quarterly compliance Annexure with PFRDA within the prescribed window, certified by the Compliance Officer.', 'SPF is a PFRDA-registered NPS Pension Fund Manager (Category I Regulated Entity) and must report on the PFRDA ICS compliance cadence.'),
    mk('CERTIN', m1.monyy, 'Q1c', 'CERT-In', `Log retention & NTP sync attestation — ${m1.rptQuarter}`, 'Quarterly', '20(3)/2022', 'karthik', 'rohan', m1.y, m1.m, 10, m1.dim, 'Maintain logs for a rolling 180 days within Indian jurisdiction and keep ICT system clocks synchronised to NTP; attest the same.', 'CERT-In Direction 20(3)/2022 mandates in-India 180-day log retention and NTP synchronisation for SPF’s systems.'),
    mk('DPDP', m1.monyy, 'Q1c', 'DPDP', `Consent records reconciliation — ${m1.rptQuarter}`, 'Quarterly', 'DPDP-Rules-2025', 'priya', 'anjali', m1.y, m1.m, 12, m1.dim, 'Reconcile the consent ledger for subscriber personal data and evidence a valid lawful basis for each processing purpose.', 'SPF is a Data Fiduciary processing PRAN/KYC/nominee data and must maintain consent under the DPDP Act, 2023 r/w DPDP Rules, 2025.'),
    mk('CA', m1.monyy, 'Q1b', 'Companies Act', `Board meeting & minutes — ${m1.rptQuarter}`, 'Quarterly', 'CA-2013-173', 'vikram', 'meera', m1.y, m1.m, 28, m1.dim, 'Convene at least four board meetings a year with the maximum gap prescribed, and record and sign the minutes.', 'SPF is a company incorporated under the Companies Act, 2013 and bound by the Section 173 board-cadence requirement.'),
    mk('PFRDA', m2.monyy, 'H1s', 'PFRDA', `Half-yearly ICS self-assessment — ${m2.rptHalf}`, 'Half-yearly', 'ICS-50', 'rajesh', 'meera', m2.y, m2.m, 14, m2.dim, 'Complete the half-yearly Information & Cyber Security self-assessment against the PFRDA ICS Guidelines and place it before the board.', 'As a PFRDA intermediary, SPF must maintain and self-attest a board-approved ICS posture aligned to ISO 27001 / NIST CSF.'),
    mk('CA', m2.monyy, 'Q1ac', 'Companies Act', `Audit committee meeting — ${m2.rptQuarter}`, 'Quarterly', 'CA-2013-177', 'sunita', 'vikram', m2.y, m2.m, 25, m2.dim, 'Hold the Audit Committee meetings, review the financials and internal controls, and minute the proceedings.', 'SPF meets the Section 177 thresholds and must constitute and operate an Audit Committee.'),
  )

  // Worked proof-chain examples for the nearest cycle — a draft working paper is
  // auto-captured the moment the period closes, so the EVD node is populated
  // end-to-end even before the return is filed (mirrors the in-flight MGT-7
  // pattern). The maker-checker advances to "Submitted" for these.
  const draftAt = iso(new Date(NOW_MS - 2 * 86400000))
  const worked: { stem: string; code: string; ev: { id: string; title: string; type: Evidence['type']; by: string; source: string } }[] = [
    { code: 'GST', stem: 'R2', ev: { id: 'EVD-44701', title: `GSTR-3B auto-assembled draft (working paper) — ${m1.periodLabel}`, type: 'Config export', by: 'CCM (auto)', source: 'ClearTax' } },
    { code: 'LAB', stem: 'R1', ev: { id: 'EVD-44702', title: `PF ECR challan — auto-computed draft — ${m1.periodLabel}`, type: 'Config export', by: 'CCM (auto)', source: 'Payroll system' } },
    { code: 'PFRDA', stem: 'R1', ev: { id: 'EVD-44703', title: `Scheme-wise NAV & AUM reconciliation working paper — ${m1.periodLabel}`, type: 'Config export', by: 'CCM (auto)', source: 'NPS Trust / CRA feed' } },
  ]
  for (const w of worked) {
    const o = obls.find((x) => x.id === `OBL-${w.code}-${m1.monyy}-${w.stem}`)
    if (!o) continue
    o.makerChecker.state = 'Submitted'
    evs.push({ id: w.ev.id, title: w.ev.title, type: w.ev.type, capturedAt: draftAt, capturedBy: w.ev.by, auto: true, linkedControls: [], linkedObligations: [o.id], frameworkRefs: [], source: w.ev.source })
  }

  obligations.push(...obls)
  evidence.push(...evs)
}
buildUpcomingFilings()

// ── Current-month cycle — the just-closed reporting period, audit-ready ───────
// The forward calendar (above) shows what is OWED; this fills the current month
// with what has just been DONE. For the reporting period that closed last month
// (e.g. May, filed across June) it seeds a deliberate lifecycle spread the demo
// can point to: filings already submitted and approved with a COMPLETE evidence
// trail (audit-ready), plus one still in maker-checker (a named checker must
// approve). It does NOT add any Overdue duty — the seeded set already carries the
// nine overdue/escalating items — so the headline anchors are untouched; these
// are pure additions that crossLink()/linkSources() map onto the proof chain.
function buildCurrentMonthCycle() {
  const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const ns = new Date(NOW_MS + (5 * 60 + 30) * 60000) // IST parts of NOW
  const y = ns.getUTCFullYear()
  const m = ns.getUTCMonth() // current (filing) month
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const monyy = `${MON3[m]}${String(y).slice(2)}`
  const pIdx = m - 1
  const pY = pIdx < 0 ? y - 1 : y
  const period = `${MONF[(pIdx + 12) % 12]} ${pY}` // the reporting period being filed
  const onDay = (day: number, h = 17, min = 30) => iso(ist(y, m + 1, Math.min(day, dim), h, min))
  // A filing submitted `before` days ahead of its statutory due day → on time.
  const filed = (dueDay: number, before: number) => iso(ist(y, m + 1, Math.max(1, Math.min(dueDay, dim) - before), 14, 0))

  const obls: Obligation[] = []
  const evs: Evidence[] = []
  const ev = (id: string, title: string, type: Evidence['type'], by: string, auto: boolean, source: string, capDay: number, oblId: string, controls: string[] = []): string => {
    evs.push({ id, title, type, capturedAt: onDay(capDay, 11, 20), capturedBy: by, auto, linkedControls: controls, linkedObligations: [oblId], frameworkRefs: [], source })
    return id
  }

  // 1 · GSTR-3B (May) — FILED, audit-ready, full worked trail (compute → pay → file).
  const gst3b = `OBL-GST-${monyy}-F3B`
  obls.push({
    id: gst3b, regulator: 'GST', title: `GSTR-3B monthly return — ${period}`, frequency: 'Monthly',
    dueDate: onDay(20), owner: 'deepa', status: 'Filed', filedAt: filed(20, 2),
    makerChecker: { maker: 'deepa', checker: 'anjali', state: 'Approved' },
    evidence: [
      ev('EVD-44704', `GSTR-3B auto-assembled draft (working paper) — ${period}`, 'Config export', 'CCM (auto)', true, 'ClearTax', 16, gst3b),
      ev('EVD-44705', `GST net-liability challan — payment acknowledgement — ${period}`, 'Filing ack', 'deepa', false, 'GST portal', 18, gst3b),
      ev('EVD-44706', `GSTR-3B filing acknowledgement (ARN) — ${period}`, 'Filing ack', 'deepa', false, 'GST portal', 18, gst3b),
    ],
    reference: 'GSTR-3B', requirement: 'File the monthly GSTR-3B summary return and discharge the net tax liability by the due date.',
    applicability: 'SPF is a GST-registered person and must furnish GSTR-3B under Section 39 of the CGST Act, 2017.', origin: 'External',
    subSteps: [
      { id: `${gst3b}-S1`, seq: 1, title: 'Auto-assemble the GSTR-3B draft and reconcile the net tax liability', clauseRef: 'SRC-GST-3B-T4', maker: 'deepa', checker: 'anjali', dueDate: onDay(16), status: 'Done', evidenceId: 'EVD-44704' },
      { id: `${gst3b}-S2`, seq: 2, title: 'Discharge the net GST liability (challan)', clauseRef: 'SRC-CGST-50', maker: 'deepa', checker: 'anjali', dueDate: onDay(18), status: 'Done', evidenceId: 'EVD-44705', dependsOnSeq: 1 },
      { id: `${gst3b}-S3`, seq: 3, title: 'File GSTR-3B and capture the ARN acknowledgement', clauseRef: 'SRC-CGST-47', maker: 'deepa', checker: 'anjali', dueDate: onDay(20), status: 'Done', evidenceId: 'EVD-44706', dependsOnSeq: 2 },
    ],
  })

  // 2 · PF & ESI ECR (May) — FILED, audit-ready.
  const pf = `OBL-LAB-${monyy}-FPF`
  obls.push({
    id: pf, regulator: 'Labour', title: `PF & ESI monthly challan — ${period}`, frequency: 'Monthly',
    dueDate: onDay(15), owner: 'farhan', status: 'Filed', filedAt: filed(15, 3),
    makerChecker: { maker: 'farhan', checker: 'anjali', state: 'Approved' },
    evidence: [
      ev('EVD-44707', `PF ECR — auto-computed contribution statement — ${period}`, 'Config export', 'CCM (auto)', true, 'Payroll system', 12, pf),
      ev('EVD-44708', `EPFO ECR challan — remittance acknowledgement (TRRN) — ${period}`, 'Filing ack', 'farhan', false, 'EPFO portal', 13, pf),
    ],
    reference: 'EPFO', requirement: 'Remit employee/employer provident-fund contributions via the monthly ECR challan by the statutory due date.',
    applicability: 'SPF is a covered establishment under the EPF & MP Act, 1952; late deposit attracts damages (s.14B) and interest (s.7Q).', origin: 'External',
  })

  // 3 · Monthly NAV & AUM (May) — FILED, audit-ready.
  const nav = `OBL-PFRDA-${monyy}-FNAV`
  obls.push({
    id: nav, regulator: 'PFRDA', title: `Monthly NAV & AUM statement — ${period}`, frequency: 'Monthly',
    dueDate: onDay(7), owner: 'arvind', status: 'Filed', filedAt: filed(7, 1),
    makerChecker: { maker: 'arvind', checker: 'meera', state: 'Approved' },
    evidence: [
      ev('EVD-44709', `Scheme-wise NAV & AUM reconciliation working paper — ${period}`, 'Config export', 'CCM (auto)', true, 'NPS Trust / CRA feed', 5, nav),
      ev('EVD-44710', `Signed monthly NAV & AUM statement — PFRDA submission acknowledgement — ${period}`, 'Filing ack', 'arvind', false, 'PFRDA portal', 6, nav),
    ],
    reference: 'PFRDA-NAV', requirement: 'Submit the monthly scheme-wise NAV and AUM statement to PFRDA and the NPS Trust, reconciled to the CRA records.',
    applicability: 'SPF manages NPS Scheme E/C/G/A across Tier I & II and must report scheme NAV/AUM as a PFM.', origin: 'External',
  })

  // 4 · CERT-In monthly cyber incident summary (May) — FILED, audit-ready.
  const certin = `OBL-CERTIN-${monyy}-FINC`
  obls.push({
    id: certin, regulator: 'CERT-In', title: `Cyber incident summary report — ${period}`, frequency: 'Monthly',
    dueDate: onDay(5), owner: 'karthik', status: 'Filed', filedAt: filed(5, 1),
    makerChecker: { maker: 'karthik', checker: 'rajesh', state: 'Approved' },
    evidence: [
      ev('EVD-44711', `Splunk SIEM incident extract — ${period}`, 'Log', 'CCM (auto)', true, 'Splunk SIEM', 3, certin),
      ev('EVD-44712', `Signed monthly cyber incident summary — CERT-In submission — ${period}`, 'Attestation', 'karthik', false, 'CERT-In portal', 4, certin),
    ],
    reference: '20(3)/2022', requirement: 'Report cyber incidents to CERT-In within six hours of detection and provide the periodic incident summary.',
    applicability: 'As a body corporate operating ICT systems in India, SPF is bound by CERT-In Direction 20(3)/2022.', origin: 'External',
  })

  // 5 · DSAR fulfilment status report (May) — IN REVIEW: maker submitted, the
  //     named checker (Anjali) must approve before month-end. The "who needs to
  //     do what" handoff, due in the last days of the current month.
  const dsar = `OBL-DPDP-${monyy}-FDSAR`
  obls.push({
    id: dsar, regulator: 'DPDP', title: `DSAR fulfilment status report — ${period}`, frequency: 'Monthly',
    dueDate: onDay(Math.min(30, dim)), owner: 'priya', status: 'In review',
    makerChecker: { maker: 'priya', checker: 'anjali', state: 'Submitted' },
    evidence: [
      ev('EVD-44713', `DSAR register extract — access/correction/erasure fulfilment — ${period}`, 'Config export', 'priya', false, 'Consent & Privacy platform', 24, dsar),
    ],
    reference: 'DPDP-Rules-2025', requirement: 'Track and report Data Principal request (access/correction/erasure) fulfilment within the prescribed timelines.',
    applicability: 'As a Data Fiduciary, SPF must honour Data Principal rights for subscriber personal data under the DPDP framework.', origin: 'External',
  })

  obligations.push(...obls)
  evidence.push(...evs)
}
buildCurrentMonthCycle()

// ── cross-linking pass ──────────────────────────────────────────────────────
function crossLink() {
  const r = new Rand(999)
  const controlById = new Map(controls.map((c) => [c.id, c]))

  // risks → controls (already) → back-link controls → risks
  for (const risk of risks) {
    for (const cid of risk.linkedControls) {
      const c = controlById.get(cid)
      if (c && !c.linkedRisks.includes(risk.id)) c.linkedRisks.push(risk.id)
    }
  }

  // issues → controls back-link
  for (const issue of issues) {
    for (const cid of issue.linkedControls) {
      const c = controlById.get(cid)
      if (c && !c.linkedIssues.includes(issue.id)) c.linkedIssues.push(issue.id)
    }
  }

  // evidence → controls evidenceCount + obligations
  const oblById = new Map(obligations.map((o) => [o.id, o]))
  for (const ev of evidence) {
    for (const oid of ev.linkedObligations) {
      const o = oblById.get(oid)
      if (o && !o.evidence.includes(ev.id)) o.evidence.push(ev.id)
    }
  }

  // ensure overdue/in-review obligations have at least one evidence reference
  for (const o of obligations) {
    if (o.evidence.length === 0) {
      const candidate = evidence[(o.id.length * 7) % evidence.length]
      o.evidence.push(candidate.id)
      candidate.linkedObligations.push(o.id)
    }
  }

  // marquee incident links — pick cyber/IT risks, relevant controls, issues
  const marquee = incidents[0]
  const cyberRisks = risks.filter((x) => x.domain === 'Cyber' || x.domain === 'IT').slice(0, 3)
  marquee.linkedRisks = cyberRisks.map((x) => x.id)
  cyberRisks.forEach((x) => x.linkedIncidents.push(marquee.id))
  const malwareControls = controls.filter((c) => /malware|backup|patch|vulnerab|monitor|logging|authentication/i.test(c.title)).slice(0, 5)
  marquee.linkedControls = malwareControls.map((c) => c.id)
  marquee.evidence = ['EVD-44192', 'EVD-44193', 'EVD-44201', 'EVD-44215']

  // link the failing CCM control (set up in buildControls) to a spawned issue + the marquee.
  // This is the "failures auto-escalate" chain: CCM rule → Issue → Incident.
  const patchControl =
    controls.find((c) => /patch|vulnerab/i.test(c.title) && c.automation === 'CCM' && c.result === 'Fail') ??
    controls.find((c) => c.automation === 'CCM' && c.result === 'Fail')
  if (patchControl) {
    const spawnedIssue = issues.find((i) => i.source === 'Control failure')
    if (spawnedIssue) {
      spawnedIssue.linkedControls = [patchControl.id]
      spawnedIssue.sourceRef = patchControl.id
      spawnedIssue.severity = 'High'
      spawnedIssue.status = 'In progress'
      spawnedIssue.title = 'Breached patch SLA — 3 critical vulnerabilities past the 14-day window'
      patchControl.linkedIssues = Array.from(new Set([...patchControl.linkedIssues, spawnedIssue.id]))
      marquee.linkedIssues = Array.from(new Set([...marquee.linkedIssues, spawnedIssue.id]))
      // make the CCM control a first-class cross-ref on the incident ("control failure that spawned it")
      marquee.linkedControls = Array.from(new Set([patchControl.id, ...marquee.linkedControls]))
      patchControl.linkedRisks = Array.from(new Set([...patchControl.linkedRisks, ...marquee.linkedRisks]))
    }
  }

  // other open incidents → risks/controls
  for (let i = 1; i < 5; i++) {
    const inc = incidents[i]
    inc.linkedRisks = r.sample(risks.filter((x) => x.domain === 'Cyber' || x.domain === 'IT'), 2).map((x) => x.id)
    inc.linkedControls = r.sample(controls, 3).map((c) => c.id)
  }

  // reg-change → obligations/controls impact (featured ones)
  const gstChange = regChanges.find((c) => c.summary.includes('GSTR-3B'))
  if (gstChange) {
    gstChange.impactedObligations = obligations.filter((o) => o.regulator === 'GST' && o.title.includes('3B')).slice(0, 2).map((o) => o.id)
    gstChange.impactedControls = controls.filter((c) => /reconcil|filing|change management/i.test(c.title)).slice(0, 2).map((c) => c.id)
  }
  const pfrdaChange = regChanges.find((c) => c.summary.includes('exposure caps'))
  if (pfrdaChange) {
    pfrdaChange.impactedObligations = obligations.filter((o) => o.regulator === 'PFRDA').slice(0, 2).map((o) => o.id)
    pfrdaChange.impactedControls = controls.filter((c) => /exposure|investment limit/i.test(c.title)).slice(0, 2).map((c) => c.id)
  }
  // generic linkage for the rest - every change shows a real (if modest) impact
  // picture on both obligations and controls (Epic 3.1).
  const fwForReg: Record<string, string> = { PFRDA: 'PFRDA ICS', 'CERT-In': 'NIST CSF', DPDP: 'ISO 27001', GST: 'ISO 27001', Labour: 'ISO 27001', 'Companies Act': 'ISO 27001' }
  for (let i = 0; i < regChanges.length; i++) {
    const ch = regChanges[i]
    if (ch.impactedObligations.length === 0)
      ch.impactedObligations = obligations.filter((o) => o.regulator === ch.regulator && o.origin !== 'Internal').slice(0, 2).map((o) => o.id)
    if (ch.impactedControls.length === 0) {
      const fw = fwForReg[ch.regulator]
      const pool = controls.filter((c) => c.frameworks.includes(fw as Control['frameworks'][number]))
      // deterministic, varied pick per change so impacts are not all identical
      ch.impactedControls = (pool.length ? pool : controls).slice(i % 7, (i % 7) + 1).map((c) => c.id)
    }
  }

  // link obligations back to reg-change
  for (const ch of regChanges) {
    for (const oid of ch.impactedObligations) {
      const o = oblById.get(oid)
      if (o) o.linkedRegChange = ch.id
    }
  }

  // audit finding → spawned Issue (1:1 for open findings) — "each finding spawns an Issue"
  const openFindings = audits.flatMap((a) => a.findings.filter((f) => f.status !== 'Closed').map((f) => ({ a, f })))
  const auditIssues = issues.filter((i) => i.source === 'Audit finding')
  openFindings.forEach(({ a, f }, idx) => {
    const issue = auditIssues[idx % auditIssues.length]
    if (issue) {
      f.linkedIssue = issue.id
      issue.sourceRef = f.id
      issue.title = `${f.title} — remediation (${a.id})`
      issue.severity = f.severity
      // An open finding's 1:1 remediation cannot already be Resolved — otherwise the
      // finding reads open while its issue reads closed, and the Open-findings metric
      // (derived from the linked issue) understates the 27 baseline. Coerce off
      // Resolved so the seed is internally consistent and closure is an in-session act.
      if (issue.status === 'Resolved') issue.status = 'In progress'
    }
  })
}
crossLink()

// ── provenance pass (Epic 1) — attach real instrument sources to records ────
// Every obligation, policy and control gets ≥1 openable SourceReference; the
// reverse lookup (lib/sources.ts) resolves a source back to what it produced.
function linkSources() {
  const uniq = (xs: string[]) => Array.from(new Set(xs))

  // Obligations: regulator default + title-specific instruments.
  for (const o of obligations) {
    const t = o.title.toLowerCase()
    // Policy-driven research-review cycles trace to the dedicated review-cadence
    // clause (only CTRL-COMP-INVRES-01 cites it), keeping their proof chain clean.
    if (o.id.startsWith('OBL-INT-INVRES')) {
      o.sourceRefs = ['SRC-PFRDA-INV-REVIEW']
      continue
    }
    let refs: string[]
    if (o.regulator === 'Labour') {
      // Professional tax → the state PT Act (not the EPF Act — corrects the
      // earlier mislink); PF/ESI → the EPF & MP Act provisions.
      refs = /professional tax|profession/.test(t)
        ? ['SRC-PT-4', 'SRC-PT-6', 'SRC-PT-8']
        : ['SRC-EPF-6', 'SRC-EPF-14B', 'SRC-EPF-7Q']
    } else {
      refs = [sourceForRegulator(o.regulator)]
      if (o.regulator === 'PFRDA') {
        if (/invest|nav|aum|exposure|committee/.test(t)) refs.push('SRC-PFRDA-INV-2025')
        if (/cyber|ics|incident|self-assessment/.test(t)) refs.push('SRC-PFRDA-ICS-2024', 'SRC-PFRDA-ICS-2025')
      } else if (o.regulator === 'GST') {
        refs.push('SRC-CGST-50')
      } else if (o.regulator === 'CERT-In') {
        refs.push('SRC-ITACT-70B')
      } else if (o.regulator === 'Companies Act') {
        // Route each Companies Act duty to its OWN clause — REASSIGN (not push):
        // the regulator default seeds SRC-CA-92-5 (the annual-return clause), and
        // the prior catch-all left it on board (s.173) and audit-committee (s.177)
        // duties, so the MGT-7 source page wrongly led with "Board meeting &
        // minutes". Match most-specific first; only true MGT-7 duties keep s.92(5).
        if (/roc filing health|director disqualification|continuous filing default/i.test(t)) {
          refs = ['SRC-CA-164-2', 'SRC-CA-92-5', 'SRC-CA-137-3']
        } else if (/mgt-7|annual return/.test(t)) refs = ['SRC-CA-92-5', 'SRC-CA-92-2', 'SRC-CA-403']
        else if (/financial|aoc/.test(t)) refs = ['SRC-CA-137-3', 'SRC-CA-403']
        else if (/audit committee/.test(t)) refs = ['SRC-CA-177']
        else if (/board meeting|board & committee|minutes/.test(t)) refs = ['SRC-CA-173']
        else if (/related[- ]party/.test(t)) refs = ['SRC-CA-188']
        else if (/register/.test(t)) refs = ['SRC-CA-88']
        else if (/declaration|disclosure of interest|mbp-1|dir-8/.test(t)) refs = ['SRC-CA-184']
        else refs = ['SRC-CA-173']
      }
    }
    o.sourceRefs = uniq(refs)
  }

  // Sources pipeline: the clause→control link (linkedControlId) is seed-driven on
  // the clause itself (src/data/sources.ts) — no obligation linkage here.

  // Policies: by category, leading with the closest instrument/standard.
  const byCat: Record<string, string[]> = {
    Investment: ['SRC-PFRDA-INV-2025', 'SRC-ISO-37301'],
    Security: ['SRC-ISO-27001', 'SRC-NIST-CSF'],
    Data: ['SRC-DPDP-2025', 'SRC-ISO-27001'],
    Compliance: ['SRC-ISO-37301'],
    Governance: ['SRC-CA-92-5', 'SRC-ISO-37301'],
    Risk: ['SRC-ISO-37301', 'SRC-ISO-27001'],
    Resilience: ['SRC-ISO-27001'],
    IT: ['SRC-ISO-27001', 'SRC-NIST-CSF'],
  }
  for (const p of policies) {
    p.sourceRefs = uniq(byCat[p.category] ?? ['SRC-ISO-37301'])
  }

  // Controls: each framework mapping carries the standard it satisfies. Where a
  // control maps to frameworks, derive its sourceRefs from them; where it has no
  // framework mapping (e.g. a state-tax control), keep the seed-provided sourceRefs
  // so the source→control link to its clauses survives.
  for (const c of controls) {
    c.mappedFrameworkRefs = c.mappedFrameworkRefs.map((m) => ({
      ...m,
      sourceRef: sourceForFramework(m.framework),
    }))
    const derived = uniq(c.mappedFrameworkRefs.map((m) => m.sourceRef!).filter(Boolean))
    if (derived.length) c.sourceRefs = derived
  }
}
linkSources()

// ── Investment research-review: the inspection finding it remediates ─────────
// Runs after crossLink/linkSources so the generators don't reassign these. A
// past PFRDA inspection observed that research reviews were performed but not
// documented per cycle; the firm stood up CTRL-COMP-INVRES-01 in OneGRC to force
// the evidence. The finding is Closed (so the 27-open anchor holds) and the
// ongoing Investment Operations audit (AUD-INT-2026-04) is where the IISC
// minutes and per-cycle notes are now sampled.
function curateInvestmentResearchChain() {
  const issue: Issue = {
    id: 'ISS-2026-0301',
    title: 'Investment research reviews performed but not documented per cycle — PFRDA inspection observation',
    source: 'Audit finding',
    sourceRef: 'AUD-INT-2026-04',
    severity: 'Medium',
    owner: 'arvind',
    dueDate: iso(new Date(NOW_MS - 20 * 86400000)),
    ageDays: 96,
    status: 'Resolved',
    linkedControls: ['CTRL-COMP-INVRES-01'],
  }
  issues.push(issue)
  const invCtrl = controls.find((c) => c.id === 'CTRL-COMP-INVRES-01')
  if (invCtrl) invCtrl.linkedIssues = Array.from(new Set([...invCtrl.linkedIssues, issue.id]))
  const audit = audits.find((a) => a.id === 'AUD-INT-2026-04')
  if (audit)
    audit.findings.push({
      id: 'AUD-INT-2026-04-INVRES',
      title: 'Investment research reviews performed but not documented per cycle',
      severity: 'Medium',
      status: 'Closed',
      linkedIssue: issue.id,
    })
}
curateInvestmentResearchChain()

// ── Companies Act evidence cleanup ───────────────────────────────────────────
// The generated CA cycles (board meetings, audit-committee meetings, MGT-7
// filings) previously synthesised their task evidence from the random pool — so a
// board-minutes task could show a "patch log export". Point each at a
// representative artifact of the right type so the secretarial chain reads true.
function curateCompaniesActEvidence() {
  const repByType: { test: RegExp; ev: string }[] = [
    { test: /audit committee/i, ev: 'EVD-44652' },
    { test: /board meeting|minutes/i, ev: 'EVD-44651' },
    { test: /mgt-7|annual return/i, ev: 'EVD-44653' },
  ]
  const evById = new Map(evidence.map((e) => [e.id, e]))
  for (const o of obligations) {
    if (o.regulator !== 'Companies Act') continue
    if (!o.id.startsWith('OBL-CA-') || o.id.startsWith('OBL-CA-FY')) continue // skip the curated worked cycles
    const rep = repByType.find((r) => r.test.test(o.title))?.ev
    if (!rep) continue
    // Detach the random-pool evidence that crossLink had bound to this cycle, so
    // the source-page evidence reads true, then bind the representative artifact.
    for (const oldId of o.evidence) {
      if (oldId === rep) continue
      const old = evById.get(oldId)
      if (old) old.linkedObligations = old.linkedObligations.filter((x) => x !== o.id)
    }
    o.evidence = [rep]
    const ev = evById.get(rep)
    if (ev && !ev.linkedObligations.includes(o.id)) ev.linkedObligations.push(o.id)
  }
  // Random-pool auto evidence (EVD-440xx–445xx) sometimes sampled a bespoke CA
  // control as its linked control and was then titled after it ("Console
  // screenshot — Annual return MGT-7"), polluting the CA source pages. Strip the
  // CA controls from those pool items; the curated artifacts (incl. the
  // auto-assembled drafts, id ≥ 44600) are untouched.
  const caCtrl = /^CTRL-COMP-CA-0[1-7]$/
  for (const e of evidence) {
    if (Number(e.id.slice(4)) >= 44600) continue // keep curated CA artifacts
    e.linkedControls = e.linkedControls.filter((c) => !caCtrl.test(c))
  }
}
curateCompaniesActEvidence()

// ── activity stream (15 rows, real IST timestamps near NOW) ─────────────────
function buildActivity(): ActivityItem[] {
  const items: ActivityItem[] = []
  const ccmFail = controls.find((c) => c.result === 'Fail' && c.automation === 'CCM')!
  const push = (mins: number, kind: ActivityItem['kind'], actor: string, text: string, ref: string, route: string) =>
    items.push({ id: `ACT-${items.length + 1}`, at: minsFromNow(-mins), actor, kind, text, ref, route })

  push(8, 'ccm-fail', 'CCM (auto)', `CCM rule "${ccmFail.title}" FAILED — 3 of population non-compliant; auto-spawned issue + incident link`, ccmFail.id, `/ccm/${ccmFail.ccmRuleId ?? ccmFail.id}`)
  push(14, 'evidence', 'CCM (auto)', 'Evidence EVD-44192 auto-captured (EDR detection export) and linked to INC-2026-0411', 'EVD-44192', '/incidents/INC-2026-0411')
  push(23, 'incident', 'Neha Joshi', 'Incident INC-2026-0411 escalated to Critical — three regulator clocks started', 'INC-2026-0411', '/incidents/INC-2026-0411')
  push(41, 'evidence', 'CCM (auto)', 'Config baseline export auto-captured for 12 controls (AWS Security Hub feed)', 'EVD-44380', '/evidence')
  push(58, 'reg-change', 'Regulatory Intelligence feed', 'Regulatory change RCM-2026-118 ingested — GSTR-3B Table 4 format revised; obligation + control auto-updated', 'RCM-2026-118', '/reg-change/RCM-2026-118')
  push(72, 'dsar', 'Priya Sharma', 'DSAR-2026-0047 raised — erasure request placed on hold pending PFRDA retention rule', 'DSAR-2026-0047', '/dpdp/dsar/DSAR-2026-0047')
  push(96, 'approval', 'Anjali Deshmukh', 'Approved (maker-checker) quarterly PFRDA compliance return for filing', obligations.find((o) => o.regulator === 'PFRDA')!.id, '/obligations')
  push(118, 'obligation', 'Deepa Iyer', 'GSTR-3B monthly return moved to "In review" after reg-change impact assessment', obligations.find((o) => o.regulator === 'GST')!.id, '/obligations')
  push(140, 'ccm-pass', 'CCM (auto)', 'CCM rule "MFA enforced on privileged access" PASSED across full population (0 exceptions)', 'CTRL-ISO-A.8.5', '/controls/CTRL-ISO-A.8.5')
  push(165, 'audit', 'Lakshmi Rao', 'New audit finding logged in AUD-INT-2026-03 — privileged access recertification overdue', 'AUD-INT-2026-03', '/audits/AUD-INT-2026-03')
  push(190, 'reg-change', 'PFRDA circular', 'PFRDA circular PFRDA/2025/05/ICS/01 — Scheme E exposure caps tightened; investment control flagged', 'RCM-2026-117', '/reg-change/RCM-2026-117')
  push(220, 'evidence', 'Rohan Gupta', 'Manual attestation uploaded for backup restoration test (Q1)', 'EVD-44510', '/evidence')
  push(255, 'incident', 'Karthik Nair', 'High incident INC-2026-0405 contained — phishing campaign; CERT-In report filed', 'INC-2026-0405', '/incidents/INC-2026-0405')
  push(300, 'policy', 'Priya Sharma', 'Data Privacy (DPDP) Policy v3.2 published and mapped to 7 controls', 'POL-010', '/policies/POL-010')
  push(355, 'obligation', 'Farhan Ali', 'PF & ESI monthly challan filed; filing acknowledgement captured as evidence', obligations.find((o) => o.regulator === 'Labour')!.id, '/obligations')

  return items
}
const activity = buildActivity()

// ── role-aware queue ────────────────────────────────────────────────────────
function buildQueue(): QueueTask[] {
  const q: QueueTask[] = []
  let n = 1
  const add = (role: RoleKey, kind: QueueTask['kind'], title: string, ref: string, route: string, dueDays: number, priority: Severity) =>
    q.push({ id: `Q-${n++}`, role, kind, title, ref, route, due: daysFromNow(dueDays), priority })

  // EXECUTIVE (Meera) — board-altitude oversight, sign-offs and exceptions
  add('EXEC', 'Approval', 'Approve quarterly PFRDA compliance return for filing', obligations.find((o) => o.regulator === 'PFRDA')!.id, '/obligations', 1, 'High')
  add('EXEC', 'Incident action', 'Review & sign off three-regulator response for INC-2026-0411', 'INC-2026-0411', '/incidents/INC-2026-0411', 0, 'Critical')
  add('EXEC', 'Approval', 'Approve enterprise risk treatment plan for top-5 residual risks', risks[0].id, '/risks', 2, 'High')
  add('EXEC', 'Reg-change review', 'Endorse impact assessment of PFRDA exposure-cap circular', 'RCM-2026-117', '/reg-change/RCM-2026-117', 1, 'High')
  add('EXEC', 'Approval', 'Approve board risk pack for Risk Management Committee', 'POL-016', '/policies', 3, 'Medium')
  add('EXEC', 'Evidence request', 'Confirm KRI evidence for monthly board dashboard', 'EVD-44380', '/evidence', 2, 'Medium')
  add('EXEC', 'Approval', 'Sign off DPDP erasure-vs-retention decision (DSAR-2026-0047)', 'DSAR-2026-0047', '/dpdp/dsar/DSAR-2026-0047', 4, 'Medium')
  add('EXEC', 'Incident action', 'Approve PFRDA 48-hour intimation for INC-2026-0411', 'INC-2026-0411', '/incidents/INC-2026-0411', 1, 'Critical')
  add('EXEC', 'Approval', 'Approve overdue obligation remediation plan (9 items)', obligations.find((o) => o.status === 'Overdue')!.id, '/obligations', 2, 'High')
  add('EXEC', 'Evidence request', 'Approve audit evidence pack for AUD-IS-2026-01', 'AUD-IS-2026-01', '/audits/AUD-IS-2026-01', 5, 'Medium')
  add('EXEC', 'Approval', 'Approve third-party risk acceptance for vendor renewal', risks.find((x) => x.domain === 'ThirdParty')!.id, '/risks', 6, 'Low')
  add('EXEC', 'Incident action', 'Review open High incidents on the clock (4)', 'INC-2026-0405', '/incidents', 1, 'High')
  add('EXEC', 'Approval', 'Sign off IISC minutes for the active-holdings research review cycle', 'OBL-INT-INVRES-W1', '/obligations/OBL-INT-INVRES-W1', 1, 'Medium')

  // RISK MANAGER (Sanjay) — register, treatment, heat map, investment risk
  add('RISK', 'Reg-change review', 'Assess Scheme E exposure-cap circular impact on risk', 'RCM-2026-117', '/reg-change/RCM-2026-117', 0, 'Critical')
  add('RISK', 'Approval', 'Endorse top-5 residual risk treatment plans', risks[0].id, '/risks', 1, 'High')
  add('RISK', 'Approval', 'Approve issuer concentration risk treatment (Scheme E)', risks.find((x) => x.domain === 'Investment')!.id, '/risks', 2, 'High')
  add('RISK', 'Control re-test', 'Review failing CCM control feeding cyber risk', 'CTRL-PCI-6.3.3', '/ccm', 1, 'High')
  add('RISK', 'Approval', 'Sign off liquidity-mismatch risk monitoring for Scheme G', risks.find((x) => x.domain === 'Investment')!.id, '/risks', 2, 'Medium')
  add('RISK', 'Evidence request', 'Confirm KRI evidence for Risk Management Committee', 'EVD-44380', '/evidence', 3, 'Medium')
  add('RISK', 'Incident action', 'Update risk realised by INC-2026-0411 (ransomware)', 'INC-2026-0411', '/incidents/INC-2026-0411', 1, 'High')
  add('RISK', 'Approval', 'Approve third-party / vendor risk acceptance (CRA services)', risks.find((x) => x.domain === 'ThirdParty')!.id, '/risks', 4, 'Medium')
  add('RISK', 'Reg-change review', 'Reassess operational risk after labour-code change', 'RCM-2026-112', '/reg-change', 5, 'Low')
  add('RISK', 'Approval', 'Refresh RCSA for IT & cyber domain', risks.find((x) => x.domain === 'Cyber')!.id, '/risks', 6, 'Medium')

  // COMPLIANCE MANAGER (Anjali) — obligations, reg-change, DPDP, clause decisions
  add('CCO', 'Approval', 'Sign off 9 overdue obligations remediation', obligations.find((o) => o.status === 'Overdue')!.id, '/obligations', 0, 'Critical')
  add('CCO', 'Approval', 'Check & approve GSTR-3B monthly return', obligations.find((o) => o.regulator === 'GST')!.id, '/obligations', 1, 'High')
  add('CCO', 'Reg-change review', 'Assess GSTR-3B Table 4 format change', 'RCM-2026-118', '/reg-change/RCM-2026-118', 1, 'High')
  add('CCO', 'Approval', 'Decide DPDP breach-intimation clause (save to control)', 'SRC-DPDP-6', '/sources/section/SRC-DPDP-6', 1, 'High')
  add('CCO', 'Approval', 'Approve DSAR fulfilment status report', 'DSAR-2026-0047', '/dpdp', 2, 'Medium')
  add('CCO', 'Reg-change review', 'Review DPDP Rules 2025 consent-manager obligations', 'RCM-2026-115', '/reg-change/RCM-2026-115', 3, 'Medium')
  add('CCO', 'Reg-change review', 'Triage 8 new regulatory updates this week', 'RCM-2026-113', '/reg-change', 2, 'Medium')
  add('CCO', 'Approval', 'Approve MGT-7 annual return draft (Companies Act)', 'OBL-CA-FY26-03', '/obligations', 8, 'Low')
  add('CCO', 'Approval', 'Review quarterly ROC filing health and Section 164(2) monitoring', 'OBL-CA-FY26-05', '/obligations', 5, 'Medium')
  add('CCO', 'Approval', 'Check PFRDA half-yearly ICS self-assessment', obligations.find((o) => o.regulator === 'PFRDA')!.id, '/obligations', 6, 'Medium')
  add('CCO', 'Incident action', 'Confirm DPDP track for INC-2026-0411', 'INC-2026-0411', '/incidents/INC-2026-0411', 1, 'High')
  add('CCO', 'Approval', 'Approve AML/KYC policy refresh', 'POL-020', '/policies', 7, 'Low')
  add('CCO', 'Evidence request', 'Provide filing acks for board compliance pack', 'EVD-44510', '/evidence', 3, 'Low')
  add('CCO', 'Evidence request', 'Record IISC minutes — 4 of 8 sector research notes captured this cycle', 'OBL-INT-INVRES-W1', '/obligations/OBL-INT-INVRES-W1', 1, 'Medium')

  // COMPLIANCE ANALYST (Deepa) — first-line filings, clause-pipeline work, evidence
  add('ANALYST', 'Approval', 'File GSTR-3B monthly return and submit for check', obligations.find((o) => o.regulator === 'GST')!.id, '/obligations', 1, 'High')
  add('ANALYST', 'Approval', 'Deposit EPF contributions & file ECR (due 15th)', 'OBL-EPF-JUN26-01', '/obligations', 3, 'High')
  add('ANALYST', 'Reg-change review', 'Work GST late-fee clause into the monthly control', 'SRC-CGST-47', '/sources/section/SRC-CGST-47', 2, 'Medium')
  add('ANALYST', 'Evidence request', 'Attach GSTR-3B filing acknowledgement as evidence', 'EVD-44400', '/evidence', 1, 'High')
  add('ANALYST', 'Reg-change review', 'Process newly arrived EPFO ECR validation update', 'SRC-EPF-6', '/sources/section/SRC-EPF-6', 4, 'Medium')
  add('ANALYST', 'Approval', 'Submit Maharashtra PTRC monthly return for check', 'OBL-PT-JUN26-01', '/obligations', 2, 'Medium')
  add('ANALYST', 'Evidence request', 'Collect consent reconciliation evidence', 'EVD-44400', '/evidence', 4, 'Medium')
  add('ANALYST', 'Reg-change review', 'Triage labour-code wage-definition change for HR filings', 'RCM-2026-112', '/reg-change', 5, 'Low')
  add('ANALYST', 'Approval', 'File professional-tax PTEC annual payment', 'OBL-PT-FY26-02', '/obligations', 6, 'Low')
  add('ANALYST', 'Evidence request', 'Upload contribution reconciliation for internal audit', 'EVD-44430', '/evidence', 4, 'Medium')

  // CONTROL OWNER (Rajesh / security & IT controls) — tests, CCM, incident actions
  add('CTRLOWNER', 'Incident action', 'Sign off CERT-In Annexure I for INC-2026-0411 (clock running)', 'INC-2026-0411', '/incidents/INC-2026-0411', 0, 'Critical')
  add('CTRLOWNER', 'Control re-test', 'Re-test failing patch-SLA CCM rule', 'CTRL-PCI-6.3.3', '/ccm', 0, 'Critical')
  add('CTRLOWNER', 'Incident action', 'Approve containment closure for INC-2026-0402', 'INC-2026-0402', '/incidents', 1, 'High')
  add('CTRLOWNER', 'Control re-test', 'Recertify privileged access (CRA interface)', 'CTRL-ISO-A.8.2', '/controls/CTRL-ISO-A.8.2', 2, 'High')
  add('CTRLOWNER', 'Evidence request', 'Provide SIEM log evidence for IS audit', 'AUD-IS-2026-01', '/audits/AUD-IS-2026-01', 3, 'Medium')
  add('CTRLOWNER', 'Approval', 'Approve vulnerability remediation exception', 'ISS-2026-0100', '/issues', 2, 'High')
  add('CTRLOWNER', 'Reg-change review', 'Assess CERT-In log-retention advisory', 'RCM-2026-116', '/reg-change/RCM-2026-116', 4, 'Medium')
  add('CTRLOWNER', 'Control re-test', 'Review backup restoration test result', 'CTRL-ISO-A.8.13', '/controls/CTRL-ISO-A.8.13', 5, 'Medium')
  add('CTRLOWNER', 'Incident action', 'Tune detection rule from phishing incident', 'INC-2026-0405', '/incidents/INC-2026-0405', 3, 'Medium')
  add('CTRLOWNER', 'Approval', 'Approve cloud security policy update', 'POL-013', '/policies/POL-013', 6, 'Low')
  add('CTRLOWNER', 'Evidence request', 'Attest endpoint EDR coverage', 'EVD-44192', '/evidence', 4, 'Low')
  add('CTRLOWNER', 'Control re-test', 'Validate NTP clock-sync control', 'CTRL-ISO-A.8.17', '/controls/CTRL-ISO-A.8.17', 2, 'Medium')

  // AUDITOR (Sunita) — audits, findings, remediation, evidence trail
  add('AUDITOR', 'Evidence request', 'Request access-recertification evidence (finding F1)', 'AUD-INT-2026-03', '/audits/AUD-INT-2026-03', 1, 'High')
  add('AUDITOR', 'Approval', 'Approve audit report for IS audit FY2025-26', 'AUD-IS-2026-01', '/audits/AUD-IS-2026-01', 2, 'High')
  add('AUDITOR', 'Incident action', 'Verify post-incident actions for INC-2026-0411', 'INC-2026-0411', '/incidents/INC-2026-0411', 3, 'High')
  add('AUDITOR', 'Evidence request', 'Collect logging-coverage evidence for NAV engine', 'EVD-44380', '/evidence', 2, 'Medium')
  add('AUDITOR', 'Approval', 'Approve issue closure for ISS-2026-0102', 'ISS-2026-0102', '/issues', 4, 'Medium')
  add('AUDITOR', 'Control re-test', 'Independent re-test of patch-SLA control', 'CTRL-PCI-6.3.3', '/ccm', 1, 'High')
  add('AUDITOR', 'Evidence request', 'Sample exposure-limit monitoring evidence', 'EVD-44420', '/evidence', 5, 'Medium')
  add('AUDITOR', 'Approval', 'Approve DPDP readiness audit scope', 'AUD-INT-2026-05', '/audits/AUD-INT-2026-05', 6, 'Low')
  add('AUDITOR', 'Evidence request', 'Request BCP/DR test evidence', 'EVD-44510', '/evidence', 3, 'Medium')
  add('AUDITOR', 'Approval', 'Approve internal audit plan for next quarter', 'AUD-INT-2026-08', '/audits', 8, 'Low')
  add('AUDITOR', 'Incident action', 'Track 27 open findings to remediation', 'ISS-2026-0100', '/issues', 2, 'Medium')
  add('AUDITOR', 'Control re-test', 'Validate segregation-of-duties remediation', 'CTRL-ISO-A.5.3', '/controls/CTRL-ISO-A.5.3', 4, 'Medium')

  // ADMINISTRATOR (Imran) — users, roles, frameworks, integrations, audit log
  add('ADMIN', 'Approval', 'Recertify platform user access (quarterly review)', 'EVD-44380', '/settings', 1, 'High')
  add('ADMIN', 'Approval', 'Approve maker-checker rule change for incident sign-off', 'POL-016', '/settings', 2, 'High')
  add('ADMIN', 'Evidence request', 'Review integration health: 11 connected spokes', 'EVD-44192', '/integrations', 0, 'Medium')
  add('ADMIN', 'Approval', 'Enable PFRDA ICS framework library for new clauses', 'POL-013', '/settings', 3, 'Medium')
  add('ADMIN', 'Evidence request', 'Export tamper-evident audit log for IS audit', 'AUD-IS-2026-01', '/settings', 2, 'Medium')
  add('ADMIN', 'Approval', 'Provision Compliance Analyst seat & role grant', 'EVD-44510', '/settings', 4, 'Low')
  add('ADMIN', 'Reg-change review', 'Confirm CERT-In feed connector after advisory', 'RCM-2026-116', '/integrations', 3, 'Low')
  add('ADMIN', 'Approval', 'Update data-retention policy configuration', 'POL-018', '/settings', 5, 'Low')

  return q
}
const queue = buildQueue()

// ── headline metrics (board KPIs) ───────────────────────────────────────────
const passOrPartial = controls.filter((c) => c.result !== 'Fail').length
const controlCoverage = (passOrPartial / controls.length) * 100 // → 96.2%
const openIncidents = incidents.filter((i) => i.status !== 'Closed')
const criticalOpen = openIncidents.filter((i) => i.classification === 'Critical').length
const overdueObligations = obligations.filter((o) => o.status === 'Overdue').length
const openFindings = audits.reduce((s, a) => s + a.findings.filter((f) => f.status === 'Open' || f.status === 'Remediation').length, 0)

export const METRICS = {
  enterpriseRisk: 7.8, // /10 (board aggregate), ▲ vs last quarter
  enterpriseRiskTrend: 'up' as const,
  controlCoverage, // ≈ 96.2
  ccmAutomated: controls.filter((c) => c.automation === 'CCM').length,
  openIncidents: openIncidents.length, // 5
  criticalOpen, // 1
  overdueObligations, // 9
  dueSoonObligations: obligations.filter((o) => o.status === 'Due').length,
  openFindings, // 27
  aumCrore: 324718,
  subscribers: 4186902,
  regUpdates2025: 12973,
}

export const WORLD = {
  people: PEOPLE,
  controls,
  risks,
  incidents,
  obligations,
  policies,
  issues,
  evidence,
  audits,
  regChanges,
  dataAssets,
  dsars,
  activity,
  queue,
  sources: SOURCES,
  instruments: INSTRUMENTS,
}

export type World = typeof WORLD

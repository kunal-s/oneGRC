import type {
  Risk,
  Control,
  Obligation,
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
import { ist, NOW_MS, minsFromNow, daysFromNow } from '@/lib/time'

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
  const d = (h: number, m: number, s = 0) => iso(ist(2026, 6, 10, h, m, s))
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
  const detected = iso(ist(2026, 6, 10, 2, 14, 0))
  const tracks: RegulatorTrack[] = [
    {
      regulator: 'CERT-In',
      clockLabel: 'CERT-In · 6-hour incident report',
      windowHours: 6,
      clockStartedAt: detected,
      deadline: iso(ist(2026, 6, 10, 8, 14, 0)),
      status: 'At risk',
      output: 'CERT-In Incident Report — Annexure I (Direction 20(3)/2022)',
    },
    {
      regulator: 'PFRDA',
      clockLabel: 'PFRDA · 48-hour ICS intimation',
      windowHours: 48,
      clockStartedAt: detected,
      deadline: iso(ist(2026, 6, 12, 2, 14, 0)),
      status: 'On track',
      output: 'PFRDA ICS incident intimation + quarterly Annexure (subscriber-impacting)',
    },
    {
      regulator: 'DPDP Board',
      clockLabel: 'DPDP Board · ~72-hour breach intimation',
      windowHours: 72,
      clockStartedAt: detected,
      deadline: iso(ist(2026, 6, 13, 2, 14, 0)),
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
      'Splunk SIEM correlated mass file-encryption with SMB lateral movement on the fund-accounting database SPF-FA-DB-02 at 02:14 IST and auto-raised a P1 ticket in Sankalp ServiceDesk (the in-house ITSM); affected assets were enriched from the ServiceDesk CMDB. CrowdStrike EDR auto-isolated the host and SecOps contained lateral movement within 17 minutes. Because the event is subscriber-impacting and involves personal data, OneGRC auto-classified it Critical (PFRDA ICS 2024) and opened three regulator tracks on one clock — CERT-In (6h), PFRDA (48h), DPDP Board (~72h) — driving three regulator outputs from a single incident record and one evidence trail.',
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
    obligations.push({
      id,
      regulator: def.reg,
      title: def.title,
      frequency: def.freq,
      dueDate,
      owner: maker,
      status,
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
  obligations.push(
    {
      id: 'OBL-INT-INVREV-Q1', regulator: 'PFRDA', title: 'Quarterly investment-policy holdings review', frequency: 'Quarterly',
      dueDate: iso(new Date(NOW_MS + 9 * 86400000)), owner: 'arvind', status: 'In review',
      makerChecker: { maker: 'arvind', checker: 'meera', state: 'Submitted' }, evidence: [], reference: 'IP-REV-Q1',
      requirement: 'Review the firm holdings against the board-approved investment policy and minute it at the Investment Committee.',
      applicability: 'Set by the firm’s own investment policy, not a single statute.', origin: 'Internal',
      policySource: 'Board-approved Investment Policy', sourceRefs: ['SRC-PFRDA-INV-COMMITTEE'],
    },
    {
      id: 'OBL-INT-INVREV-PREVQ', regulator: 'PFRDA', title: 'Quarterly investment-policy holdings review (prior cycle)', frequency: 'Quarterly',
      dueDate: iso(new Date(NOW_MS - 84 * 86400000)), owner: 'arvind', status: 'Filed',
      makerChecker: { maker: 'arvind', checker: 'meera', state: 'Approved' }, evidence: ['EVD-44420'], reference: 'IP-REV-PREVQ',
      requirement: 'Review the firm holdings against the board-approved investment policy and minute it at the Investment Committee.',
      applicability: 'Set by the firm’s own investment policy, not a single statute.', origin: 'Internal',
      policySource: 'Board-approved Investment Policy', sourceRefs: ['SRC-PFRDA-INV-COMMITTEE'],
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
  const sources = ['AWS Security Hub', 'Splunk SIEM', 'Qualys VM', 'CrowdStrike EDR', 'Okta/AD', 'Sankalp ServiceDesk', 'OneTrust', 'ClearTax']
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
    { summary: 'GSTR-3B table 4 ITC reporting format revised', reg: 'GST', src: 'TeamLease RegTech', detail: 'CBIC notification revises the GSTR-3B Table 4 auto-population and ITC reversal disclosure. The monthly GSTR-3B obligation template and the reconciliation control are auto-updated; owner Deepa Iyer alerted.' },
    { summary: 'PFRDA revises scheme-wise exposure caps for Scheme E', reg: 'PFRDA', src: 'PFRDA circular', detail: 'PFRDA circular tightens single-issuer and sectoral exposure caps for Scheme E. The exposure-limit monitoring control and the quarterly investment return obligation are auto-updated; owners Arvind Patel and Sanjay Verma alerted.' },
    { summary: 'CERT-In reiterates 6-hour reporting & log retention', reg: 'CERT-In', src: 'Lexplosion Komrisk', detail: 'Advisory reiterates Direction 20(3)/2022 — 6-hour incident reporting, 180-day in-India log retention and NTP synchronization.' },
    { summary: 'DPDP Rules 2025 notify consent-manager obligations', reg: 'DPDP', src: 'Lexplosion Komrisk', detail: 'DPDP Rules 2025 operationalize consent-manager registration and breach intimation timelines.' },
    { summary: 'Companies Act — CSR disclosure amendment', reg: 'Companies Act', src: 'TeamLease RegTech', detail: 'MCA amends CSR reporting in the board report.' },
    { summary: 'Labour codes — wage definition clarification', reg: 'Labour', src: 'TeamLease RegTech', detail: 'Clarification on wage definition impacting PF contribution computation.' },
    { summary: 'PFRDA committee cadence guidance updated', reg: 'PFRDA', src: 'PFRDA circular', detail: 'Guidance on Risk, Audit, Investment and NRC committee frequency and minute-keeping.' },
    { summary: 'GST e-invoicing threshold revised', reg: 'GST', src: 'TeamLease RegTech', detail: 'e-invoicing applicability threshold revised.' },
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
  })
  const types: Dsar['type'][] = ['Access', 'Erasure', 'Correction', 'Nomination']
  for (let i = 0; i < 13; i++) {
    dsars.push({
      id: `DSAR-2026-00${48 + i}`,
      pran: `1100${r.int(1000, 9999)}${r.int(1000, 9999)}`,
      type: r.pick(types),
      raisedAt: iso(new Date(NOW_MS - r.int(1, 25) * 86400000)),
      dueDate: iso(new Date(NOW_MS + r.int(3, 28) * 86400000)),
      status: r.weighted<Dsar['status']>([['Open', 3], ['In review', 3], ['On hold', 1]]),
      owner: 'priya',
      note: r.pick([
        'Access request — compiling data inventory across CRA and KYC stores.',
        'Correction of nominee details pending CRA confirmation.',
        'Nomination update routed to CRA (Protean) interface.',
        'Access request — identity verification completed.',
      ]),
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
    nextDue: ist(2026, 6, 30).toISOString(),
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
    nextDue: ist(2026, 6, 30).toISOString(),
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
    nextDue: ist(2026, 6, 26).toISOString(),
    sourceRefs: ['SRC-PFRDA-INV-2025', 'SRC-PFRDA-INV-COMMITTEE'],
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
    nextDue: ist(2026, 6, 30).toISOString(),
    sourceRefs: ['SRC-CERTIN-LOGS'],
  },
]
controls.push(...COMPLIANCE_CONTROLS)

const risks = buildRisks(controls)
const incidents = buildIncidents()
const obligations = buildObligations()
const policies = buildPolicies(controls)
const issues = buildIssues(controls, incidents)
const evidence = buildEvidence(controls, obligations)
const audits = buildAudits()
const regChanges = buildRegChanges()
const dataAssets = buildDataAssets()
const dsars = buildDsars()

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
  // generic linkage for the rest
  for (const ch of regChanges) {
    if (ch.impactedObligations.length === 0)
      ch.impactedObligations = obligations.filter((o) => o.regulator === ch.regulator).slice(0, 1).map((o) => o.id)
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
    let refs: string[]
    if (o.regulator === 'Labour') {
      // Professional tax → the state PT Act (not the EPF Act — corrects the
      // earlier mislink); PF/ESI → the EPF & MP Act provisions.
      refs = /professional tax|profession/.test(t)
        ? ['SRC-PT-3', 'SRC-PT-6']
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
        if (/mgt-7|annual return/.test(t)) refs.push('SRC-CA-92-5', 'SRC-CA-403')
        else if (/financial|aoc/.test(t)) refs.push('SRC-CA-137-3', 'SRC-CA-403')
        else refs.push('SRC-CA-92-5')
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

  // Controls: each framework mapping carries the standard it satisfies.
  for (const c of controls) {
    c.mappedFrameworkRefs = c.mappedFrameworkRefs.map((m) => ({
      ...m,
      sourceRef: sourceForFramework(m.framework),
    }))
    c.sourceRefs = uniq(c.mappedFrameworkRefs.map((m) => m.sourceRef!))
  }
}
linkSources()

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
  push(58, 'reg-change', 'TeamLease RegTech', 'Regulatory change RCM-2026-118 ingested — GSTR-3B Table 4 format revised; obligation + control auto-updated', 'RCM-2026-118', '/reg-change/RCM-2026-118')
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
  add('CCO', 'Approval', 'Check PFRDA half-yearly ICS self-assessment', obligations.find((o) => o.regulator === 'PFRDA')!.id, '/obligations', 6, 'Medium')
  add('CCO', 'Incident action', 'Confirm DPDP track for INC-2026-0411', 'INC-2026-0411', '/incidents/INC-2026-0411', 1, 'High')
  add('CCO', 'Approval', 'Approve AML/KYC policy refresh', 'POL-020', '/policies', 7, 'Low')
  add('CCO', 'Evidence request', 'Provide filing acks for board compliance pack', 'EVD-44510', '/evidence', 3, 'Low')

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

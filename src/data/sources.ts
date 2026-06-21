// OneGRC — Source & Provenance seed (Epic 1; normalized + enriched in Epic 15).
// THE single source model: parent SourceInstrument (the legal instrument) +
// SourceProvision children (the section/clause), each carrying its full
// structured compliance fields, sourced penalty tiers, a severity derived from
// the penalty, and a review-to-track lifecycle. Extracts are short real
// excerpts held inline. No second source model exists — Epic 14 reuses this one.
import type {
  AgentAction,
  Framework,
  PenaltyTier,
  Regulator,
  Severity,
  SourceInstrument,
  SourceProvision,
} from '@/types'
import { ist } from '@/lib/time'

const d = (y: number, m: number, day: number) => ist(y, m, day).toISOString()
const t = (y: number, m: number, day: number, h: number, mi: number) => ist(y, m, day, h, mi).toISOString()

// The Regulatory-Change Agent parse (Epic 14, Story 14.2) — scripted, with
// provenance + confidence; severity is then auto-rated from the penalty. Defined
// here because the intake instruments below reference it.
const parse = (recommendation: string, confidence: number, basis: string, at: string): AgentAction => ({
  agent: 'Regulatory-Change Agent',
  recommendation,
  confidence,
  at,
  basis,
})

// ── Severity from penalty (the minimal Epic 4 slice) ────────────────────────
const SEV_ORDER: Severity[] = ['Low', 'Medium', 'High', 'Critical']
export function severityFromPenalty(tiers: PenaltyTier[] = []): Severity | undefined {
  if (!tiers.length) return undefined
  return tiers.reduce<Severity>(
    (max, t) => (SEV_ORDER.indexOf(t.severity) > SEV_ORDER.indexOf(max) ? t.severity : max),
    tiers[0].severity,
  )
}

// ── Instruments (parents) ───────────────────────────────────────────────────
export const INSTRUMENTS: SourceInstrument[] = [
  {
    id: 'INST-PFRDA-INV-2025',
    title: 'PFRDA Master Circular on Investment Guidelines for NPS Schemes',
    authority: 'PFRDA',
    regulator: 'PFRDA',
    instrumentType: 'Master Circular',
    dateOfIssue: d(2025, 12, 10),
    effectiveDate: d(2025, 12, 10),
    version: 'v2025.12',
    supersedesId: 'INST-PFRDA-INV-2025-MAR',
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.pfrda.org.in/web/pfrda/regulatory-framework/master-circulars/active-master-circulars',
    attachedDocument: { filename: 'PFRDA-MC-Investment-Guidelines-10Dec2025.pdf', label: 'Master Circular (PDF)', capturedAt: d(2025, 12, 11), sizeLabel: '438 KB' },
    status: 'In force',
  },
  {
    id: 'INST-PFRDA-INV-2025-MAR',
    title: 'PFRDA Master Circular on Investment Guidelines for NPS Schemes (28 Mar 2025)',
    authority: 'PFRDA',
    regulator: 'PFRDA',
    instrumentType: 'Master Circular',
    dateOfIssue: d(2025, 3, 28),
    effectiveDate: d(2025, 3, 28),
    version: 'v2025.03',
    supersededById: 'INST-PFRDA-INV-2025',
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.pfrda.org.in/web/pfrda/regulatory-framework/master-circulars',
    attachedDocument: { filename: 'PFRDA-MC-Investment-Guidelines-28Mar2025.pdf', label: 'Master Circular (PDF) — prior version', capturedAt: d(2025, 4, 2), sizeLabel: '402 KB' },
    status: 'Superseded',
  },
  {
    id: 'INST-PFRDA-ICS-2024',
    title: 'PFRDA Guidelines on Information & Cyber Security for Intermediaries, 2024',
    authority: 'PFRDA',
    regulator: 'PFRDA',
    instrumentType: 'Standard',
    dateOfIssue: d(2024, 4, 1),
    effectiveDate: d(2024, 4, 1),
    version: '2024 edition',
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.pfrda.org.in/index1.cshtml?lsid=237',
    status: 'In force',
  },
  {
    id: 'INST-PFRDA-ICS-2025',
    title: 'PFRDA Circular — Cyber Security Incident Classification & Reporting',
    authority: 'PFRDA',
    regulator: 'PFRDA',
    instrumentType: 'Circular',
    referenceNumber: 'PFRDA/2025/05/ICS/01',
    dateOfIssue: d(2025, 9, 15),
    effectiveDate: d(2025, 9, 15),
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.pfrda.org.in/index1.cshtml?lsid=237',
    status: 'In force',
  },
  {
    id: 'INST-CA-2013',
    title: 'Companies Act, 2013',
    authority: 'MCA',
    regulator: 'Companies Act',
    instrumentType: 'Act',
    dateOfIssue: d(2013, 8, 29),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/acts.html',
    status: 'In force',
  },
  {
    id: 'INST-CA-FEES-2014',
    title: 'Companies (Registration Offices and Fees) Rules, 2014',
    authority: 'MCA',
    regulator: 'Companies Act',
    instrumentType: 'Rules',
    dateOfIssue: d(2014, 3, 31),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/rules.html',
    status: 'In force',
  },
  {
    id: 'INST-CGST-2017',
    title: 'Central Goods and Services Tax Act, 2017',
    authority: 'CBIC',
    regulator: 'GST',
    instrumentType: 'Act',
    dateOfIssue: d(2017, 4, 12),
    sourceChannel: 'Regulator site',
    sourceLink: 'https://cbic-gst.gov.in/CGST-bill-e.html',
    status: 'In force',
  },
  {
    id: 'INST-CERTIN-2022',
    title: 'CERT-In Directions under Section 70B(6) of the IT Act, 2000',
    authority: 'CERT-In',
    regulator: 'CERT-In',
    instrumentType: 'Direction',
    referenceNumber: '20(3)/2022',
    dateOfIssue: d(2022, 4, 28),
    effectiveDate: d(2022, 6, 27),
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.cert-in.org.in/Directions70B.jsp',
    status: 'In force',
  },
  {
    id: 'INST-ITACT-2000',
    title: 'Information Technology Act, 2000',
    authority: 'MeitY',
    instrumentType: 'Act',
    dateOfIssue: d(2009, 10, 27),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.meity.gov.in/content/information-technology-act-2000',
    status: 'In force',
  },
  {
    id: 'INST-EPF-1952',
    title: 'Employees’ Provident Funds and Miscellaneous Provisions Act, 1952',
    authority: 'EPFO',
    regulator: 'Labour',
    instrumentType: 'Act',
    dateOfIssue: d(1952, 3, 4),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.epfindia.gov.in/site_en/Acts.php',
    status: 'In force',
  },
  {
    id: 'INST-PT-MAH-1975',
    title: 'Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975',
    authority: 'Maharashtra Finance Dept (Profession Tax)',
    regulator: 'Labour',
    instrumentType: 'Act',
    dateOfIssue: d(1975, 4, 1),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://mahagst.gov.in/en/acts',
    status: 'In force',
  },
  {
    id: 'INST-DPDP-2025',
    title: 'Digital Personal Data Protection Act, 2023 & DPDP Rules, 2025',
    authority: 'MeitY',
    regulator: 'DPDP',
    instrumentType: 'Rules',
    dateOfIssue: d(2025, 11, 13),
    effectiveDate: d(2025, 11, 13),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.meity.gov.in/data-protection-framework',
    status: 'In force',
  },
  {
    id: 'INST-ISO-37301',
    title: 'ISO 37301:2021 — Compliance Management Systems',
    authority: 'ISO',
    instrumentType: 'Standard',
    dateOfIssue: d(2021, 4, 13),
    version: '2021 edition',
    sourceChannel: 'Content feed',
    sourceLink: 'https://www.iso.org/standard/75080.html',
    status: 'In force',
  },
  {
    id: 'INST-ISO-27001',
    title: 'ISO/IEC 27001:2022 — Information Security Management Systems',
    authority: 'ISO',
    instrumentType: 'Standard',
    dateOfIssue: d(2022, 10, 25),
    version: '2022 edition',
    sourceChannel: 'Content feed',
    sourceLink: 'https://www.iso.org/standard/27001',
    attachedDocument: { filename: 'ISO-IEC-27001-2022.pdf', label: 'Standard (licensed copy)', capturedAt: d(2025, 2, 18), sizeLabel: '1.2 MB' },
    status: 'In force',
  },
  {
    id: 'INST-NIST-CSF',
    title: 'NIST Cybersecurity Framework (CSF) 2.0',
    authority: 'NIST',
    instrumentType: 'Standard',
    dateOfIssue: d(2024, 2, 26),
    version: '2.0',
    sourceChannel: 'Content feed',
    sourceLink: 'https://www.nist.gov/cyberframework',
    status: 'In force',
  },
  {
    id: 'INST-PCI-DSS',
    title: 'PCI DSS v4.0 — Payment Card Industry Data Security Standard',
    authority: 'PCI SSC',
    instrumentType: 'Standard',
    dateOfIssue: d(2022, 3, 31),
    version: 'v4.0',
    sourceChannel: 'Content feed',
    sourceLink: 'https://www.pcisecuritystandards.org/document_library/',
    status: 'In force',
  },
  // ── Compliance Intake — incoming circulars (Epic 14) ──────────────────────
  // Arrived via intake, parsed onto this same model, awaiting triage. status is
  // 'Draft' until accepted into the live register.
  {
    id: 'INST-GST-3B-2026',
    title: 'CBIC — Revised GSTR-3B Table 4 (ITC) reporting format',
    authority: 'CBIC',
    regulator: 'GST',
    instrumentType: 'Notification',
    dateOfIssue: d(2026, 6, 4),
    sourceChannel: 'Content feed',
    sourceLink: 'https://cbic-gst.gov.in/',
    status: 'Draft',
    intake: {
      channel: 'Auto-pull',
      receivedAt: t(2026, 6, 5, 8, 30),
      parse: parse('Parsed one provision (revised Table 4 ITC reporting). Maps to the GSTR-3B obligation; late fee unchanged under s.47.', 92.7, 'CBIC notification text on the revised GSTR-3B Table 4 format.', t(2026, 6, 5, 8, 32)),
      triageState: 'Parsed',
    },
  },
  {
    id: 'INST-EPFO-HP-2026',
    title: 'EPFO — Revised ECR validations & higher-pension processing',
    authority: 'EPFO',
    regulator: 'Labour',
    instrumentType: 'Circular',
    dateOfIssue: d(2026, 6, 3),
    sourceChannel: 'Manual upload',
    sourceLink: 'https://www.epfindia.gov.in/site_en/index.php',
    status: 'Draft',
    intake: {
      channel: 'Manual upload',
      receivedAt: t(2026, 6, 4, 10, 15),
      parse: parse('Parsed revised ECR validation rules affecting the monthly challan. Damages (s.14B) and interest (s.7Q) consequences carry over.', 87.5, 'EPFO circular uploaded by the Labour & Secretarial team.', t(2026, 6, 4, 10, 18)),
      triageState: 'Needs internal review',
    },
  },
  {
    id: 'INST-DPDP-OPS-2026',
    title: 'MeitY — Notice on phased commencement of the DPDP Rules, 2025',
    authority: 'MeitY',
    regulator: 'DPDP',
    instrumentType: 'Notification',
    dateOfIssue: d(2026, 6, 7),
    sourceChannel: 'Content feed',
    sourceLink: 'https://www.meity.gov.in/data-protection-framework',
    status: 'Draft',
    intake: {
      channel: 'Auto-pull',
      receivedAt: t(2026, 6, 8, 9, 40),
      parse: parse('Parsed a commencement-date provision for the breach-intimation duty. Severity auto-rated Critical from the ₹250 crore penalty; applicable date is ambiguous.', 79.3, 'MeitY commencement notice referencing the DPDP Rules, 2025.', t(2026, 6, 8, 9, 43)),
      triageState: 'Needs external specialist',
    },
  },
  {
    id: 'INST-PFRDA-EXP-2026',
    title: 'PFRDA — Clarification on single-issuer exposure & prudential norms',
    authority: 'PFRDA',
    regulator: 'PFRDA',
    instrumentType: 'Circular',
    dateOfIssue: d(2026, 6, 8),
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.pfrda.org.in/',
    status: 'Draft',
    intake: {
      channel: 'Auto-pull',
      receivedAt: t(2026, 6, 9, 7, 20),
      parse: parse('Parsed a revised single-issuer exposure-limit provision. Maps to the exposure-limit breach report obligation; severity High.', 90.8, 'PFRDA clarification circular on exposure norms.', t(2026, 6, 9, 7, 23)),
      triageState: 'Under triage',
    },
  },
  {
    id: 'INST-LABOUR-SS-2026',
    title: 'Ministry of Labour & Employment — Draft rules under the Code on Social Security, 2020',
    authority: 'Ministry of Labour & Employment',
    regulator: 'Labour',
    instrumentType: 'Rules',
    dateOfIssue: d(2026, 5, 30),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://labour.gov.in/',
    status: 'Draft',
    intake: {
      channel: 'Auto-pull',
      receivedAt: t(2026, 6, 3, 14, 5),
      parse: parse('Parsed a draft social-security contribution-alignment provision. Not yet in force; final notification and State rules pending.', 71.4, 'Draft rules published under the Code on Social Security, 2020.', t(2026, 6, 3, 14, 8)),
      triageState: 'Parked',
      parkedReason: 'Draft only — awaiting final notification and the corresponding State rules before triage.',
    },
  },
  {
    id: 'INST-CERTIN-ADV-2026',
    title: 'CERT-In — Advisory reaffirming 6-hour ransomware reporting timelines',
    authority: 'CERT-In',
    regulator: 'CERT-In',
    instrumentType: 'Direction',
    dateOfIssue: d(2026, 6, 1),
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.cert-in.org.in/',
    status: 'In force',
    intake: {
      channel: 'Auto-pull',
      receivedAt: t(2026, 6, 2, 11, 30),
      parse: parse('Parsed an advisory reaffirming the 6-hour reporting timeline under Direction 20(3)/2022. Accepted into the register; no new obligation, reinforces the existing CERT-In duty.', 95.1, 'CERT-In advisory text reaffirming the 6-hour clock.', t(2026, 6, 2, 11, 33)),
      triageState: 'Live',
    },
  },
]

// ── Provision builder ───────────────────────────────────────────────────────
// recommendedObligationIds are filled in the world.ts provenance pass (they
// reference generated obligation ids); severity is derived from the penalty.
type ProvInput = Omit<SourceProvision, 'recommendedObligationIds' | 'severity'>
function prov(p: ProvInput): SourceProvision {
  return { ...p, severity: severityFromPenalty(p.penaltyTiers), recommendedObligationIds: [] }
}
const ai = (recommendation: string, confidence: number, basis: string, at: string): AgentAction => ({
  agent: 'Ingestion Agent',
  recommendation,
  confidence,
  at,
  basis,
})
const tier = (trigger: string, consequence: string, severity: Severity, sourceRef: string): PenaltyTier => ({ trigger, consequence, severity, sourceRef })

// ── Provisions (children) ───────────────────────────────────────────────────
export const SOURCES: SourceProvision[] = [
  // PFRDA Investment Guidelines
  prov({
    id: 'SRC-PFRDA-INV-2025',
    instrumentId: 'INST-PFRDA-INV-2025',
    provision: 'Para 4 — approved investment universe & periodic review',
    title: 'Para 4 — Investment universe & review',
    nameOfCompliance: 'Investment universe & periodic review',
    briefDescription: 'Invest only within the approved universe and minute the periodic review at the Investment Committee.',
    keyParts: [
      'Invest only in securities forming part of the approved investment universe',
      'Review the actively invested portfolio at least twice a week',
      'Review the full eligible universe at least once a year and minute it',
    ],
    penaltyTiers: [tier('Investing outside the approved universe or breaching exposure limits', 'Regulatory action by PFRDA and mandatory exposure-breach reporting', 'High', 'SRC-PFRDA-INV-2025')],
    frequency: 'Quarterly',
    nextDue: d(2026, 7, 15),
    citation: 'Master Circular on Investment Guidelines, dated 10 Dec 2025 (para 4 — universe & review)',
    sourceExtract:
      'Pension Funds shall invest only in securities forming part of the approved investment universe, and shall review the actively invested portfolio at least twice a week and the full eligible universe at least once a year, recording the review in the minutes of the Investment Committee. This Master Circular consolidates and supersedes the earlier Master Circular dated 28 March 2025.',
    aiRecommendation: ai('Save to controls and track as the Investment Committee minutes-filing obligation; the twice-weekly / annual universe review binds the PFM.', 96.4, 'Para 4 of the in-force PFRDA Master Circular (10 Dec 2025); SPF is an NPS PFM.', t(2025, 12, 12, 9, 40)),
    reviewState: 'Approved and saved',
    reviewer: 'arvind',
    reviewedAt: t(2025, 12, 15, 14, 12),
    rationale: 'Directly governs SPF’s scheme portfolios; tracked via the Investment Committee minutes obligation.',
  }),
  prov({
    id: 'SRC-PFRDA-INV-2025-MAR',
    instrumentId: 'INST-PFRDA-INV-2025-MAR',
    provision: 'Para 4 — approved investment universe & periodic review (28 Mar 2025)',
    title: 'Para 4 — Investment universe (superseded)',
    citation: 'Master Circular on Investment Guidelines, dated 28 Mar 2025 (superseded 10 Dec 2025)',
    sourceExtract:
      'Pension Funds shall invest only in securities forming part of the approved investment universe and shall review the eligible universe at least once a year. (Superseded by the consolidated Master Circular dated 10 December 2025.)',
  }),
  // PFRDA ICS
  prov({
    id: 'SRC-PFRDA-ICS-2024',
    instrumentId: 'INST-PFRDA-ICS-2024',
    provision: 'Policy clause — board-approved ICS policy & cyber crisis management plan',
    title: 'ICS policy & crisis-management plan',
    nameOfCompliance: 'Board-approved ICS policy',
    briefDescription: 'Maintain a board-approved Information & Cyber Security policy aligned to ISO 27001 / NIST CSF with a cyber crisis plan.',
    keyParts: [
      'Board-approved ICS policy aligned to ISO/IEC 27001 and NIST CSF',
      'Cyber crisis management plan with defined roles and escalation',
      'Incident reporting to PFRDA',
    ],
    penaltyTiers: [tier('Absence of a board-approved ICS policy or crisis plan', 'Supervisory action by PFRDA on the intermediary', 'Medium', 'SRC-PFRDA-ICS-2024')],
    frequency: 'Half-yearly',
    citation: 'PFRDA ICS Policy Guidelines, 2024',
    sourceExtract:
      'Every intermediary shall put in place a board-approved Information & Cyber Security policy aligned to ISO/IEC 27001 and the NIST Cybersecurity Framework, and shall maintain a cyber crisis management plan with defined roles, escalation and incident reporting to PFRDA.',
    aiRecommendation: ai('Save to controls and track via the half-yearly ICS self-assessment and annual cyber-security audit obligations.', 88.3, 'PFRDA ICS Guidelines 2024 applicability to registered intermediaries.', t(2026, 6, 2, 10, 15)),
    reviewState: 'Under review',
    reviewer: 'anjali',
    reviewedAt: t(2026, 6, 6, 16, 30),
    rationale: 'Scope confirmed; checking which controls evidence the board-approval clause before saving.',
  }),
  prov({
    id: 'SRC-PFRDA-ICS-2025',
    instrumentId: 'INST-PFRDA-ICS-2025',
    provision: 'Incident classification & 48-hour intimation',
    title: 'Incident classification & 48h intimation',
    nameOfCompliance: 'Cyber incident intimation (48h)',
    briefDescription: 'Classify cyber incidents and intimate subscriber-impacting Critical/High incidents to PFRDA within 48 hours.',
    keyParts: [
      'Classify incidents as Critical / High / Medium / Low',
      'Intimate subscriber-impacting Critical/High incidents within 48 hours',
      'Follow with a detailed report',
    ],
    penaltyTiers: [tier('Subscriber-impacting incident not intimated within 48 hours', 'Regulatory action under the PFRDA ICS framework', 'High', 'SRC-PFRDA-ICS-2025')],
    frequency: 'Event-based',
    citation: 'Circular PFRDA/2025/05/ICS/01, dated Sept 2025',
    sourceExtract:
      'Cyber security incidents shall be classified as Critical, High, Medium or Low. Subscriber-impacting or personal-data incidents classified Critical/High shall be intimated to the Authority within 48 hours of detection, followed by a detailed report.',
    aiRecommendation: ai('Save to controls and track via the quarterly compliance return; the 48-hour clock binds subscriber-impacting incidents.', 94.1, 'Circular PFRDA/2025/05/ICS/01; SPF processes subscriber PRAN/KYC data.', t(2025, 9, 18, 11, 5)),
    reviewState: 'Approved and saved',
    reviewer: 'anjali',
    reviewedAt: t(2025, 9, 22, 12, 40),
    rationale: 'Operationalised on the marquee incident track; classification taxonomy adopted.',
  }),
  // Companies Act, 2013
  prov({
    id: 'SRC-CA-92-5',
    instrumentId: 'INST-CA-2013',
    provision: 'Section 92(5)',
    title: 'Section 92(5) — Annual return default',
    nameOfCompliance: 'Annual return (MGT-7) filing',
    briefDescription: 'File the annual return within the period specified; default carries a per-day penalty on the company and officers.',
    keyParts: ['File the annual return (MGT-7) on time', 'Penalty on the company and every officer in default'],
    penaltyTiers: [
      tier('Failure to file the annual return (company)', '₹10,000 + ₹100 per day, max ₹2,00,000', 'Medium', 'SRC-CA-92-5'),
      tier('Officer in default', '₹10,000 + ₹100 per day, max ₹50,000', 'Medium', 'SRC-CA-92-5'),
      tier('Delay in filing', 'Additional fee of ₹100 per day under s.403', 'Low', 'SRC-CA-403'),
    ],
    frequency: 'Annual',
    nextDue: d(2026, 11, 29),
    citation: 'Section 92(5), Companies Act, 2013 (as amended by the Companies (Amendment) Act, 2020)',
    sourceExtract:
      'If any company fails to file its annual return under sub-section (4) before the expiry of the period specified therein, such company and its every officer who is in default shall be liable to a penalty of ten thousand rupees and in case of continuing failure, with a further penalty of one hundred rupees for each day during which such failure continues, subject to a maximum of two lakh rupees in case of a company and fifty thousand rupees in case of an officer who is in default.',
    aiRecommendation: ai('Save to controls and track as the annual return MGT-7 filing obligation; penalty accrues per day on default.', 95.7, 'Section 92(5) applies to every company; SPF is incorporated under the Act.', t(2026, 6, 1, 9, 10)),
    reviewState: 'Approved and saved',
    reviewer: 'vikram',
    reviewedAt: t(2026, 6, 4, 11, 25),
    rationale: 'Annual return is a standing Company Secretary obligation; tracked.',
  }),
  prov({
    id: 'SRC-CA-137-3',
    instrumentId: 'INST-CA-2013',
    provision: 'Section 137(3)',
    title: 'Section 137(3) — Financial statements default',
    nameOfCompliance: 'Financial statements (AOC-4) filing',
    briefDescription: 'File the financial statements within the period specified; default carries a per-day penalty.',
    keyParts: ['File AOC-4 on time', 'Penalty on company, MD/CFO and directors'],
    penaltyTiers: [
      tier('Failure to file the financial statements', '₹10,000 + ₹100 per day, max ₹2,00,000', 'Medium', 'SRC-CA-137-3'),
      tier('Delay in filing', 'Additional fee of ₹100 per day under s.403', 'Low', 'SRC-CA-403'),
    ],
    frequency: 'Annual',
    nextDue: d(2026, 10, 30),
    citation: 'Section 137(3), Companies Act, 2013 (as amended)',
    sourceExtract:
      'If a company fails to file the copy of the financial statements before the expiry of the period specified therein, the company shall be liable to a penalty of ten thousand rupees and in case of continuing failure, with a further penalty of one hundred rupees for each day, subject to a maximum of two lakh rupees, and the managing director and the Chief Financial Officer, if any, and, in their absence, every director, shall be liable to a penalty of ten thousand rupees and in case of continuing failure, with a further penalty of one hundred rupees for each day, subject to a maximum of fifty thousand rupees.',
    aiRecommendation: ai('Save to controls and track as the AOC-4 financial-statement filing obligation.', 94.8, 'Section 137(3) applies to every company filing financial statements.', t(2026, 6, 1, 9, 12)),
    reviewState: 'Approved and saved',
    reviewer: 'vikram',
    reviewedAt: t(2026, 6, 4, 11, 30),
    rationale: 'Standing filing duty; tracked against the board calendar.',
  }),
  prov({
    id: 'SRC-CA-164-2',
    instrumentId: 'INST-CA-2013',
    provision: 'Section 164(2)',
    title: 'Section 164(2) — Director disqualification',
    nameOfCompliance: 'Director disqualification on filing default',
    briefDescription: 'A director of a company in continuous three-year filing default is disqualified for five years.',
    keyParts: ['Triggered by a continuous three-year filing default', 'Disqualifies re-appointment for five years'],
    penaltyTiers: [tier('Continuous three-year default in filing returns/financials', 'Director disqualified for five years', 'High', 'SRC-CA-164-2')],
    frequency: 'Event-based',
    citation: 'Section 164(2), Companies Act, 2013',
    sourceExtract:
      'No person who is or has been a director of a company which has not filed financial statements or annual returns for any continuous period of three financial years shall be eligible to be re-appointed as a director of that company or appointed in any other company for a period of five years from the date on which the said company fails to do so.',
    aiRecommendation: ai('Track as a consequence of a three-year filing default; confirm whether a direct tracked obligation is warranted.', 61.3, 'Section 164(2) triggers only on a continuous three-year filing default.', t(2026, 6, 1, 9, 14)),
    reviewState: 'Needs internal review',
    reviewer: 'vikram',
    reviewedAt: t(2026, 6, 5, 10, 5),
    rationale: 'Routed to the Secretarial team to confirm whether to track as a consequence control rather than a filing obligation.',
  }),
  prov({
    id: 'SRC-CA-447',
    instrumentId: 'INST-CA-2013',
    provision: 'Section 447',
    title: 'Section 447 — Punishment for fraud',
    nameOfCompliance: 'Fraud — penal consequence',
    briefDescription: 'Fraud above the statutory threshold is punishable with imprisonment and a fine up to three times the amount involved.',
    keyParts: ['Applies to fraud ≥ ₹10 lakh or 1% of turnover', 'Imprisonment 6 months to 10 years', 'Fine up to three times the amount involved'],
    penaltyTiers: [tier('Fraud involving ≥ ₹10 lakh or 1% of turnover', 'Imprisonment 6 months–10 years and fine up to 3× the amount', 'Critical', 'SRC-CA-447')],
    frequency: 'Event-based',
    citation: 'Section 447, Companies Act, 2013',
    sourceExtract:
      'Any person who is found to be guilty of fraud involving an amount of at least ten lakh rupees or one per cent of the turnover of the company, whichever is lower, shall be punishable with imprisonment for a term which shall not be less than six months but which may extend to ten years and shall also be liable to fine which shall not be less than the amount involved in the fraud, but which may extend to three times the amount involved in the fraud.',
    aiRecommendation: ai('Treat as a fraud-risk consequence feeding the whistleblower / fraud-risk controls rather than a filing obligation.', 68.5, 'Section 447 is a penal consequence provision, not a periodic filing.', t(2026, 6, 2, 14, 40)),
    reviewState: 'Under review',
    reviewer: 'anjali',
    reviewedAt: t(2026, 6, 7, 9, 15),
    rationale: 'Relevant to fraud-risk controls; confirming the mapping target before saving.',
  }),
  prov({
    id: 'SRC-CA-403',
    instrumentId: 'INST-CA-FEES-2014',
    provision: 'Section 403 r/w Rule 12 (additional fee)',
    title: 'Section 403 — Additional fee on delay',
    nameOfCompliance: 'Additional fee on late ROC filing',
    briefDescription: 'Documents filed after the specified time attract an additional fee of ₹100 per day.',
    keyParts: ['Applies to late MGT-7 and AOC-4 filings', 'Additional fee ₹100 per day until filed'],
    penaltyTiers: [tier('Late filing of MGT-7 / AOC-4', 'Additional fee of ₹100 per day until the date of filing', 'Low', 'SRC-CA-403')],
    frequency: 'Event-based',
    citation: 'Section 403 read with the Companies (Registration Offices and Fees) Rules, 2014',
    sourceExtract:
      'Any document required to be submitted, filed, registered or recorded may be so submitted after the time specified on payment of such additional fee as may be prescribed; in case of delay in filing of the annual return (MGT-7) and financial statements (AOC-4), additional fee of one hundred rupees per day is payable until the date of filing.',
    aiRecommendation: ai('Attach to the MGT-7 and AOC-4 obligations as the additional-fee consequence on delay.', 90.2, 'Fees Rules 2014 apply to SPF’s ROC filings.', t(2026, 6, 1, 9, 16)),
    reviewState: 'Approved and saved',
    reviewer: 'vikram',
    reviewedAt: t(2026, 6, 4, 11, 35),
    rationale: 'Standard additional-fee rule; tracked alongside the annual filings.',
  }),
  // GST / CGST Act, 2017
  prov({
    id: 'SRC-CGST-47',
    instrumentId: 'INST-CGST-2017',
    provision: 'Section 47',
    title: 'Section 47 — Late fee for returns',
    nameOfCompliance: 'GST return late fee',
    briefDescription: 'Late furnishing of GST returns attracts a per-day late fee under each Act.',
    keyParts: ['Applies to GSTR-3B and GSTR-1', 'Late fee ₹50/day (₹25 CGST + ₹25 SGST) for returns with liability'],
    penaltyTiers: [tier('Late filing of GSTR-3B / GSTR-1', 'Late fee ₹50 per day (₹25 under each Act) for returns with tax liability', 'Low', 'SRC-CGST-47')],
    frequency: 'Monthly',
    nextDue: d(2026, 6, 20),
    citation: 'Section 47, CGST Act, 2017 (read with late-fee notifications under the GST Acts)',
    sourceExtract:
      'Any registered person who fails to furnish the returns required under section 39 by the due date shall pay a late fee of one hundred rupees for every day during which such failure continues, subject to a prescribed maximum — and an equal amount is payable under the SGST Act. For GSTR-3B and GSTR-1 this is reduced by notification to twenty-five rupees per day under each Act (fifty rupees per day in total) for returns with tax liability.',
    aiRecommendation: ai('Save to controls and track as the GSTR-3B and GSTR-1 monthly return obligations; late fee accrues per day.', 93.6, 'Section 47 applies to every GST-registered person; SPF is registered.', t(2026, 6, 1, 8, 50)),
    reviewState: 'Approved and saved',
    reviewer: 'anjali',
    reviewedAt: t(2026, 6, 3, 15, 20),
    rationale: 'GST returns are a standing monthly obligation; tracked.',
  }),
  prov({
    id: 'SRC-CGST-50',
    instrumentId: 'INST-CGST-2017',
    provision: 'Section 50(1)',
    title: 'Section 50(1) — Interest on delayed tax',
    nameOfCompliance: 'Interest on delayed GST',
    briefDescription: 'Tax not paid within the prescribed period attracts interest up to 18% per annum.',
    keyParts: ['Applies to unpaid GST', 'Interest up to 18% p.a. on the unpaid amount'],
    penaltyTiers: [tier('Delayed payment of GST', 'Interest up to 18% per annum on the unpaid tax', 'Medium', 'SRC-CGST-50')],
    frequency: 'Monthly',
    nextDue: d(2026, 6, 20),
    citation: 'Section 50(1), CGST Act, 2017 (read with Notification 13/2017-Central Tax)',
    sourceExtract:
      'Every person who is liable to pay tax in accordance with the provisions of this Act or the rules made thereunder, but fails to pay the tax or any part thereof to the Government within the period prescribed, shall for the period for which the tax or any part thereof remains unpaid, pay, on his own, interest at such rate, not exceeding eighteen per cent, as may be notified by the Government.',
    aiRecommendation: ai('Attach to the GSTR-3B obligation as the interest-on-delay consequence (18% p.a. notified).', 86.9, 'Section 50(1) r/w Notification 13/2017-Central Tax.', t(2026, 6, 8, 10, 30)),
    reviewState: 'Recommended',
  }),
  // CERT-In
  prov({
    id: 'SRC-CERTIN-2022',
    instrumentId: 'INST-CERTIN-2022',
    provision: 'Direction No. 20(3)/2022 — 6-hour reporting, 180-day logs, NTP sync',
    title: 'Direction 20(3)/2022 — 6-hour reporting',
    nameOfCompliance: 'CERT-In incident reporting (6h)',
    briefDescription: 'Report cyber incidents to CERT-In within six hours; retain logs 180 days in India; sync clocks to NTP.',
    keyParts: ['Report cyber incidents within 6 hours of noticing', '180-day in-India log retention', 'NTP clock synchronisation'],
    penaltyTiers: [tier('Cyber incident not reported within 6 hours', 'Non-compliance punishable under s.70B — imprisonment up to 1 year or fine up to ₹1 lakh', 'High', 'SRC-ITACT-70B')],
    frequency: 'Event-based',
    citation: 'Direction No. 20(3)/2022-CERT-In, dated 28 Apr 2022',
    sourceExtract:
      'Any service provider, intermediary, data centre, body corporate and Government organisation shall mandatorily report cyber incidents to CERT-In within six hours of noticing such incidents or being brought to notice about such incidents. Logs shall be securely maintained for a rolling period of 180 days within Indian jurisdiction, and ICT systems clocks shall be synchronised to NTP.',
    aiRecommendation: ai('Save to controls and track via the cyber incident summary report and the log-retention / NTP-sync attestation obligations.', 96.1, 'Direction 20(3)/2022 binds every body corporate operating ICT systems in India.', t(2026, 6, 1, 8, 40)),
    reviewState: 'Approved and saved',
    reviewer: 'anjali',
    reviewedAt: t(2026, 6, 3, 9, 55),
    rationale: 'Operationalised on the CERT-In clock; 180-day in-India retention evidenced.',
  }),
  prov({
    id: 'SRC-ITACT-70B',
    instrumentId: 'INST-ITACT-2000',
    provision: 'Section 70B',
    title: 'Section 70B — CERT-In powers & penalty',
    nameOfCompliance: 'CERT-In enabling power & penalty',
    briefDescription: 'The enabling provision for CERT-In; non-compliance with its directions is punishable.',
    keyParts: ['CERT-In is the national incident-response agency', 'Non-compliance is punishable with imprisonment or fine'],
    penaltyTiers: [tier('Failure to comply with CERT-In directions or provide information', 'Imprisonment up to 1 year or fine up to ₹1 lakh or both', 'High', 'SRC-ITACT-70B')],
    frequency: 'Event-based',
    citation: 'Section 70B, Information Technology Act, 2000',
    sourceExtract:
      'The Indian Computer Emergency Response Team shall serve as the national agency for incident response. Any service provider, intermediaries, data centres, body corporate or person who fails to provide the information called for or comply with the directions issued shall be punishable with imprisonment for a term which may extend to one year or with fine which may extend to one lakh rupees or with both.',
    aiRecommendation: ai('Attach to the CERT-In reporting obligations as the parent power and the non-compliance penalty.', 84.6, 'Section 70B is the enabling provision for the CERT-In Directions.', t(2026, 6, 8, 10, 35)),
    reviewState: 'Recommended',
  }),
  // EPF & MP Act, 1952
  prov({
    id: 'SRC-EPF-6',
    instrumentId: 'INST-EPF-1952',
    provision: 'Section 6 — Contributions and matters which may be provided for in Schemes',
    title: 'Section 6 — Contributions',
    nameOfCompliance: 'PF contribution & monthly ECR',
    briefDescription: 'Deposit employer/employee PF contributions (12%) and file the monthly Electronic Challan-cum-Return.',
    keyParts: ['Employer contribution at 12% of basic wages, DA and retaining allowance', 'Equal employee contribution', 'Monthly ECR filing and deposit'],
    penaltyTiers: [
      tier('Default in depositing the PF contribution', 'Damages up to 100% of arrears under s.14B', 'High', 'SRC-EPF-14B'),
      tier('Delay in deposit', 'Simple interest at 12% per annum under s.7Q', 'Medium', 'SRC-EPF-7Q'),
    ],
    frequency: 'Monthly',
    nextDue: d(2026, 6, 15),
    citation: 'Section 6, Employees’ Provident Funds and Miscellaneous Provisions Act, 1952',
    sourceExtract:
      'The contribution which shall be paid by the employer to the Fund shall be ten per cent of the basic wages, dearness allowance and retaining allowance (if any) for the time being payable to each of the employees, and the employee’s contribution shall be equal to the contribution payable by the employer; provided that the Central Government may, by notification, substitute twelve per cent for ten per cent, as applies to the classes of establishments to which SPF belongs.',
    aiRecommendation: ai('Save to controls and track as the monthly PF & ESI challan (ECR) obligation; defines the 12% contribution base.', 91.7, 'Section 6 r/w the contribution-rate notification for covered establishments.', t(2026, 6, 9, 9, 20)),
    reviewState: 'Recommended',
  }),
  prov({
    id: 'SRC-EPF-14B',
    instrumentId: 'INST-EPF-1952',
    provision: 'Section 14B (r/w Para 32A of the Scheme)',
    title: 'Section 14B — Damages for default',
    nameOfCompliance: 'Damages on PF default',
    briefDescription: 'Default in PF contribution lets the PF Commissioner recover damages up to the amount of arrears.',
    keyParts: ['Triggered by default in contribution', 'Damages up to the amount of arrears', 'Recovered by the PF Commissioner'],
    penaltyTiers: [tier('Default in payment of any contribution to the Fund', 'Damages by way of penalty, not exceeding the amount of arrears', 'High', 'SRC-EPF-14B')],
    frequency: 'Event-based',
    citation: 'Section 14B, Employees’ Provident Funds and Miscellaneous Provisions Act, 1952 (r/w Para 32A of the Scheme)',
    sourceExtract:
      'Where an employer makes default in the payment of any contribution to the Fund, the Central Provident Fund Commissioner or such other officer as may be authorised may recover from the employer by way of penalty such damages, not exceeding the amount of arrears, as may be specified in the Scheme.',
    aiRecommendation: ai('Save to controls and track as the damages-on-default consequence of the monthly PF challan obligation.', 92.8, 'Section 14B applies to SPF as a covered establishment defaulting on contributions.', t(2026, 6, 2, 9, 5)),
    reviewState: 'Approved and saved',
    reviewer: 'anjali',
    reviewedAt: t(2026, 6, 5, 13, 45),
    rationale: 'Damages clause tracked against the PF challan obligation; payroll deposits are timely.',
  }),
  prov({
    id: 'SRC-EPF-7Q',
    instrumentId: 'INST-EPF-1952',
    provision: 'Section 7Q',
    title: 'Section 7Q — Interest on arrears',
    nameOfCompliance: 'Interest on PF arrears',
    briefDescription: 'Any amount due from the employer carries simple interest at 12% per annum until paid.',
    keyParts: ['Applies to any amount due under the Act', 'Simple interest at 12% per annum until payment'],
    penaltyTiers: [tier('Amount due from the employer not paid', 'Simple interest at 12% per annum until actual payment', 'Medium', 'SRC-EPF-7Q')],
    frequency: 'Event-based',
    citation: 'Section 7Q, Employees’ Provident Funds and Miscellaneous Provisions Act, 1952',
    sourceExtract:
      'The employer shall be liable to pay simple interest at the rate of twelve per cent per annum or at such higher rate as may be specified in the Scheme on any amount due from him under this Act from the date on which the amount has become so due till the date of its actual payment.',
    aiRecommendation: ai('Save to controls and track as the 12% p.a. interest-on-arrears consequence of the PF challan obligation.', 92.1, 'Section 7Q applies to any amount due from the employer under the Act.', t(2026, 6, 2, 9, 7)),
    reviewState: 'Approved and saved',
    reviewer: 'anjali',
    reviewedAt: t(2026, 6, 5, 13, 48),
    rationale: 'Interest clause tracked alongside Section 14B for the PF challan.',
  }),
  // Maharashtra Professional Tax Act, 1975 (corrects the earlier mislink to the EPF Act)
  prov({
    id: 'SRC-PT-3',
    instrumentId: 'INST-PT-MAH-1975',
    provision: 'Section 3 — Levy and charge of tax',
    title: 'Section 3 — Levy of profession tax',
    nameOfCompliance: 'Profession tax levy & deduction',
    briefDescription: 'Deduct profession tax from employee salaries, up to ₹2,500 per annum per person, per Schedule I.',
    keyParts: ['Levied on professions, trades, callings and employments', 'Up to ₹2,500 per annum per person', 'Rates per Schedule I'],
    penaltyTiers: [tier('Engaging staff liable to profession tax', 'Profession tax up to ₹2,500 per annum per person', 'Low', 'SRC-PT-3')],
    frequency: 'Monthly',
    nextDue: d(2026, 6, 30),
    citation: 'Section 3, Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975',
    sourceExtract:
      'There shall be levied and collected a tax on professions, trades, callings and employments in accordance with the provisions of this Act. Every person engaged in any profession, trade, calling or employment and falling under one or more of the entries in Schedule I shall be liable to pay the tax at the rate mentioned against the class of such persons, subject to the maximum of two thousand five hundred rupees per annum.',
    aiRecommendation: ai('Save to controls and track as the professional tax remittance obligation; deduct PT from employee salaries up to ₹2,500 p.a.', 89.4, 'Section 3 r/w Schedule I; SPF employs salaried staff in Maharashtra.', t(2026, 6, 9, 9, 25)),
    reviewState: 'Recommended',
  }),
  prov({
    id: 'SRC-PT-6',
    instrumentId: 'INST-PT-MAH-1975',
    provision: 'Section 6 — Returns and payment of tax by employers',
    title: 'Section 6 — Returns & payment',
    nameOfCompliance: 'Profession tax employer return',
    briefDescription: 'Registered employers furnish the prescribed PT return and pay the tax deducted; cadence is state-specific.',
    keyParts: ['Furnish PT return in the prescribed form and period', 'Pay the full tax due per the return'],
    penaltyTiers: [tier('Failure to furnish the PT return or pay', 'Interest and penalty as prescribed under the Act', 'Medium', 'SRC-PT-6')],
    frequency: 'Monthly',
    nextDue: d(2026, 6, 30),
    citation: 'Section 6, Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975',
    sourceExtract:
      'Every employer registered under this Act shall furnish to the prescribed authority a return in such form, for such periods and by such dates as may be prescribed, showing therein the salaries and wages paid by him and the amount of tax deducted by him in respect thereof, and shall pay the full amount of tax due according to such return.',
    aiRecommendation: ai('Save to controls and track as the professional tax return obligation; confirm the per-state filing cadence first.', 73.8, 'Section 6 prescribes employer PT returns; periodicity is state-specific.', t(2026, 6, 9, 9, 27)),
    reviewState: 'Needs specialist',
    reviewer: 'farhan',
    reviewedAt: t(2026, 6, 12, 11, 10),
    rationale: 'SPF has staff across multiple states; engaged external counsel to confirm per-state PT return cadence before saving.',
  }),
  // DPDP
  prov({
    id: 'SRC-DPDP-2025',
    instrumentId: 'INST-DPDP-2025',
    provision: 'Section 8(6) r/w DPDP Rules, 2025 (breach intimation)',
    title: 'Section 8(6) — Breach intimation',
    nameOfCompliance: 'Personal data breach intimation',
    briefDescription: 'On a personal data breach, intimate the Data Protection Board and each affected Data Principal.',
    keyParts: ['Intimate the Board on a personal data breach', 'Intimate each affected Data Principal', 'Form and manner per the DPDP Rules, 2025'],
    penaltyTiers: [tier('Failure to intimate a personal data breach', 'Penalty up to ₹250 crore as determined by the Data Protection Board', 'Critical', 'SRC-DPDP-2025')],
    frequency: 'Event-based',
    citation: 'Section 8(6), DPDP Act, 2023 r/w the DPDP Rules, 2025 (notified 13 Nov 2025)',
    sourceExtract:
      'In the event of a personal data breach, the Data Fiduciary shall give the Board and each affected Data Principal, intimation of such breach in such form and manner as may be prescribed. Substantive obligations are phased in, with the final compliance date set under the DPDP Rules, 2025.',
    aiRecommendation: ai('Save to controls and track via the consent-reconciliation and DSAR obligations; breach-intimation timing depends on the phased commencement.', 71.2, 'Section 8(6) r/w DPDP Rules 2025; phased compliance dates.', t(2026, 6, 7, 15, 0)),
    reviewState: 'Needs specialist',
    reviewer: 'priya',
    reviewedAt: t(2026, 6, 11, 10, 20),
    rationale: 'Commencement of substantive obligations is phased; external privacy counsel engaged to confirm the applicable date for SPF.',
  }),
  // Standards (referenced by controls, not obligations — no compliance review)
  prov({
    id: 'SRC-ISO-37301',
    instrumentId: 'INST-ISO-37301',
    provision: 'Clause 1 (Scope)',
    title: 'Clause 1 — Scope',
    citation: 'ISO 37301:2021, Clause 1 (Scope)',
    sourceExtract:
      'This document specifies requirements and provides guidelines for establishing, developing, implementing, evaluating, maintaining and improving an effective compliance management system within an organization.',
  }),
  prov({
    id: 'SRC-ISO-27001',
    instrumentId: 'INST-ISO-27001',
    provision: 'Clause 1 (Scope)',
    title: 'Clause 1 — Scope',
    citation: 'ISO/IEC 27001:2022, Clause 1 (Scope)',
    sourceExtract:
      'This document specifies the requirements for establishing, implementing, maintaining and continually improving an information security management system within the context of the organization.',
  }),
  prov({
    id: 'SRC-NIST-CSF',
    instrumentId: 'INST-NIST-CSF',
    provision: 'CSF Core — six Functions (Govern, Identify, Protect, Detect, Respond, Recover)',
    title: 'Core — six Functions',
    citation: 'NIST CSF 2.0, dated 26 Feb 2024',
    sourceExtract:
      'The Cybersecurity Framework (CSF) 2.0 provides guidance to industry, government agencies, and other organizations to manage cybersecurity risks. The CSF Core is organized around six Functions: Govern, Identify, Protect, Detect, Respond and Recover.',
  }),
  prov({
    id: 'SRC-PCI-DSS',
    instrumentId: 'INST-PCI-DSS',
    provision: 'Overview — baseline of technical & operational requirements',
    title: 'Overview — baseline requirements',
    citation: 'PCI DSS v4.0, Overview',
    sourceExtract:
      'PCI DSS is a global standard that provides a baseline of technical and operational requirements designed to protect account data. PCI DSS comprises a minimum set of requirements for protecting account data, and may be enhanced by additional controls.',
  }),
  // ── Compliance Intake — parsed provisions of the incoming circulars (Epic 14)
  prov({
    id: 'SRC-GST-3B-T4',
    instrumentId: 'INST-GST-3B-2026',
    provision: 'Revised Table 4 — input tax credit (ITC) reporting',
    title: 'Table 4 — Revised ITC reporting',
    nameOfCompliance: 'GSTR-3B Table 4 (ITC) reporting',
    briefDescription: 'Report eligible, reversed and reclaimed ITC in the revised Table 4 of GSTR-3B.',
    keyParts: ['Bifurcate ITC into eligible, reversed and reclaimed', 'Report net ITC availed in the revised Table 4', 'Applies from the notified return period'],
    penaltyTiers: [tier('Incorrect or late ITC reporting in GSTR-3B', 'Late fee under s.47 and interest on wrongly availed ITC under s.50', 'Low', 'SRC-CGST-47')],
    frequency: 'Monthly',
    nextDue: d(2026, 6, 20),
    citation: 'CBIC notification revising the GSTR-3B Table 4 (ITC) reporting format',
    sourceExtract:
      'Registered persons shall report input tax credit in the revised Table 4 of FORM GSTR-3B, separately disclosing ITC available, ITC reversed and reclaimed, and the net ITC availed, with effect from the notified return period.',
    aiRecommendation: ai('Update the GSTR-3B monthly return obligation to the revised Table 4 format; late-fee consequence unchanged.', 92.7, 'Revised GSTR-3B Table 4 reporting format; SPF is GST-registered.', t(2026, 6, 5, 8, 35)),
    reviewState: 'Recommended',
  }),
  prov({
    id: 'SRC-EPFO-ECR-2026',
    instrumentId: 'INST-EPFO-HP-2026',
    provision: 'Revised ECR validations for higher-pension members',
    title: 'Revised ECR validations',
    nameOfCompliance: 'Monthly ECR filing (revised validations)',
    briefDescription: 'File the monthly ECR with the revised validations for higher-pension members.',
    keyParts: ['Apply revised ECR validations from the notified wage month', 'Reflect higher-pension member contributions', 'Default still attracts damages and interest'],
    penaltyTiers: [
      tier('Default in depositing the revised PF contribution', 'Damages up to 100% of arrears under s.14B', 'High', 'SRC-EPF-14B'),
      tier('Delay in deposit', 'Interest at 12% per annum under s.7Q', 'Medium', 'SRC-EPF-7Q'),
    ],
    frequency: 'Monthly',
    nextDue: d(2026, 6, 15),
    citation: 'EPFO circular on revised ECR validations and higher-pension processing',
    sourceExtract:
      'Employers shall file the Electronic Challan-cum-Return with the revised validations for higher-pension members from the notified wage month, ensuring contributions are computed on the applicable wage base.',
    aiRecommendation: ai('Update the monthly PF & ESI challan obligation for the revised ECR validations; the s.14B / s.7Q consequences carry over.', 87.5, 'EPFO ECR revision; SPF is a covered establishment.', t(2026, 6, 4, 10, 20)),
    reviewState: 'Recommended',
  }),
  prov({
    id: 'SRC-DPDP-OPS-2026',
    instrumentId: 'INST-DPDP-OPS-2026',
    provision: 'Commencement date for the breach-intimation duty',
    title: 'Commencement — breach intimation',
    nameOfCompliance: 'DPDP breach-intimation commencement',
    briefDescription: 'Sets the date from which the Section 8(6) breach-intimation duty becomes enforceable.',
    keyParts: ['Notifies the commencement date for the breach-intimation duty', 'Reads with Section 8(6) of the DPDP Act', 'Penalty determined by the Data Protection Board'],
    penaltyTiers: [tier('Failure to intimate a breach once commenced', 'Penalty up to ₹250 crore as determined by the Data Protection Board', 'Critical', 'SRC-DPDP-2025')],
    frequency: 'Event-based',
    citation: 'MeitY notice on the phased commencement of the DPDP Rules, 2025',
    sourceExtract:
      'The provisions relating to intimation of a personal data breach under section 8(6) shall come into force on the date notified, from which Data Fiduciaries shall intimate the Board and affected Data Principals in the prescribed manner.',
    aiRecommendation: ai('Tie to the DSAR and consent obligations; confirm the applicable commencement date for SPF before tracking.', 79.3, 'Commencement notice r/w Section 8(6) of the DPDP Act, 2023.', t(2026, 6, 8, 9, 45)),
    reviewState: 'Recommended',
  }),
  prov({
    id: 'SRC-PFRDA-EXP-2026',
    instrumentId: 'INST-PFRDA-EXP-2026',
    provision: 'Revised single-issuer exposure limit',
    title: 'Revised single-issuer exposure limit',
    nameOfCompliance: 'Single-issuer exposure limit',
    briefDescription: 'Clarifies the revised single-issuer exposure ceiling for pension-fund portfolios.',
    keyParts: ['Revised single-issuer exposure ceiling', 'Monitor at the scheme-portfolio level', 'Breaches are reportable to PFRDA'],
    penaltyTiers: [tier('Breach of the revised single-issuer exposure limit', 'Regulatory action and mandatory exposure-breach reporting to PFRDA', 'High', 'SRC-PFRDA-EXP-2026')],
    frequency: 'Quarterly',
    nextDue: d(2026, 7, 15),
    citation: 'PFRDA clarification circular on single-issuer exposure and prudential norms',
    sourceExtract:
      'The single-issuer exposure of a Pension Fund shall not exceed the revised ceiling clarified herein, to be monitored at the scheme-portfolio level, with any breach reported to the Authority.',
    aiRecommendation: ai('Update the exposure-limit breach report obligation to the revised ceiling; monitor at the scheme level.', 90.8, 'PFRDA exposure-norms clarification; SPF manages NPS scheme portfolios.', t(2026, 6, 9, 7, 25)),
    reviewState: 'Recommended',
  }),
  prov({
    id: 'SRC-SS-CODE-2026',
    instrumentId: 'INST-LABOUR-SS-2026',
    provision: 'Social security contribution alignment (draft)',
    title: 'Contribution alignment (draft)',
    nameOfCompliance: 'Social Security Code contribution alignment',
    briefDescription: 'Draft alignment of provident-fund and social-security contributions under the new wage definition.',
    keyParts: ['Aligns contributions to the Code’s wage definition', 'Draft — not yet in force', 'Final notification and State rules pending'],
    penaltyTiers: [tier('Non-alignment once the Code is notified', 'Contribution shortfall recovery and penalty as prescribed under the Code', 'Medium', 'SRC-SS-CODE-2026')],
    frequency: 'Monthly',
    citation: 'Draft rules under the Code on Social Security, 2020',
    sourceExtract:
      'Contributions shall be computed on wages as defined under the Code on Social Security, 2020. These draft rules are open for comment and are not yet in force; the date of commencement shall be notified separately.',
    aiRecommendation: ai('Hold pending final notification; on commencement, align the PF challan obligation to the new wage definition.', 71.4, 'Draft rules under the Code on Social Security, 2020.', t(2026, 6, 3, 14, 10)),
    reviewState: 'Recommended',
  }),
  prov({
    id: 'SRC-CERTIN-ADV-2026',
    instrumentId: 'INST-CERTIN-ADV-2026',
    provision: 'Reaffirmed 6-hour ransomware reporting',
    title: 'Reaffirmed 6-hour reporting',
    nameOfCompliance: 'Ransomware incident reporting (6h)',
    briefDescription: 'Reaffirms the 6-hour reporting timeline for ransomware incidents under Direction 20(3)/2022.',
    keyParts: ['Reaffirms reporting within 6 hours of noticing', 'Specific emphasis on ransomware incidents', 'No change to the underlying direction'],
    penaltyTiers: [tier('Ransomware incident not reported within 6 hours', 'Non-compliance punishable under s.70B — imprisonment up to 1 year or fine up to ₹1 lakh', 'High', 'SRC-ITACT-70B')],
    frequency: 'Event-based',
    citation: 'CERT-In advisory reaffirming the 6-hour ransomware reporting timeline',
    sourceExtract:
      'Entities are reminded that ransomware and other cyber incidents must be reported to CERT-In within six hours of noticing, in line with Direction 20(3)/2022; logs are to be retained for 180 days within India.',
    aiRecommendation: ai('No new obligation — reinforces the existing CERT-In incident-reporting duty and its 6-hour clock.', 95.1, 'CERT-In advisory reaffirming Direction 20(3)/2022.', t(2026, 6, 2, 11, 35)),
    reviewState: 'Recommended',
  }),
]

export const INSTRUMENTS_BY_ID: Record<string, SourceInstrument> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.id, i]),
)

export const SOURCES_BY_ID: Record<string, SourceProvision> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
)

/** Default provision for an obligation's regulator (overridable with specifics). */
export function sourceForRegulator(reg: Regulator): string {
  switch (reg) {
    case 'PFRDA':
      return 'SRC-PFRDA-ICS-2024'
    case 'CERT-In':
      return 'SRC-CERTIN-2022'
    case 'DPDP':
      return 'SRC-DPDP-2025'
    case 'GST':
      return 'SRC-CGST-47'
    case 'Labour':
      return 'SRC-EPF-14B'
    case 'Companies Act':
      return 'SRC-CA-92-5'
  }
}

/** Standard a framework clause maps to, for per-mapping provenance on controls. */
export function sourceForFramework(fw: Framework): string {
  switch (fw) {
    case 'ISO 27001':
      return 'SRC-ISO-27001'
    case 'NIST CSF':
      return 'SRC-NIST-CSF'
    case 'PCI DSS':
      return 'SRC-PCI-DSS'
    case 'PFRDA ICS':
      return 'SRC-PFRDA-ICS-2024'
  }
}

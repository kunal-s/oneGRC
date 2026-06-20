// OneGRC — Source & Provenance seed (Epic 1; normalized in Epic 15).
// THE single source model: parent SourceInstrument (the legal instrument) +
// provision-level SourceReference children (the exact section / rule / clause),
// each with the applicability review the ingestion agent proposes. Extracts are
// short real excerpts held inline; a future document repository slots behind the
// same types. No second source model exists.
import type {
  ApplicabilityReview,
  Framework,
  Regulator,
  ReviewState,
  SourceInstrument,
  SourceReference,
} from '@/types'
import { ist } from '@/lib/time'

const d = (y: number, m: number, day: number) => ist(y, m, day).toISOString()
const t = (y: number, m: number, day: number, h: number, mi: number) => ist(y, m, day, h, mi).toISOString()

// ── Instruments (parents) ───────────────────────────────────────────────────
export const INSTRUMENTS: SourceInstrument[] = [
  // PFRDA Investment Guidelines — worked newer-version case: the 10 Dec 2025
  // Master Circular consolidated and superseded the 28 Mar 2025 one.
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
    attachedDocument: {
      filename: 'PFRDA-MC-Investment-Guidelines-10Dec2025.pdf',
      label: 'Master Circular (PDF)',
      capturedAt: d(2025, 12, 11),
      sizeLabel: '438 KB',
    },
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
    attachedDocument: {
      filename: 'PFRDA-MC-Investment-Guidelines-28Mar2025.pdf',
      label: 'Master Circular (PDF) — prior version',
      capturedAt: d(2025, 4, 2),
      sizeLabel: '402 KB',
    },
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
    attachedDocument: {
      filename: 'ISO-IEC-27001-2022.pdf',
      label: 'Standard (licensed copy)',
      capturedAt: d(2025, 2, 18),
      sizeLabel: '1.2 MB',
    },
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
]

// ── Applicability review helper ─────────────────────────────────────────────
// recommendedObligationIds are filled in the world.ts provenance pass (they
// reference generated obligation ids). The ingestion agent's recommendation is
// scripted + deterministic — provenance + confidence, never a model API call.
function review(args: {
  state: ReviewState
  recommendation: string
  confidence: number
  basis: string
  agentAt: string
  reviewer?: string
  reviewedAt?: string
  rationale?: string
}): ApplicabilityReview {
  return {
    recommendedObligationIds: [],
    aiRecommendation: {
      agent: 'Ingestion Agent',
      recommendation: args.recommendation,
      confidence: args.confidence,
      at: args.agentAt,
      basis: args.basis,
    },
    reviewState: args.state,
    reviewer: args.reviewer,
    reviewedAt: args.reviewedAt,
    rationale: args.rationale,
  }
}

// ── Provisions (children) ───────────────────────────────────────────────────
export const SOURCES: SourceReference[] = [
  // PFRDA Investment Guidelines
  {
    id: 'SRC-PFRDA-INV-2025',
    instrumentId: 'INST-PFRDA-INV-2025',
    provision: 'Para 4 — approved investment universe & periodic review',
    title: 'Para 4 — Investment universe & review',
    citation: 'Master Circular on Investment Guidelines, dated 10 Dec 2025 (para 4 — universe & review)',
    sourceExtract:
      'Pension Funds shall invest only in securities forming part of the approved investment universe, and shall review the actively invested portfolio at least twice a week and the full eligible universe at least once a year, recording the review in the minutes of the Investment Committee. This Master Circular consolidates and supersedes the earlier Master Circular dated 28 March 2025.',
    review: review({
      state: 'Confirmed applies',
      recommendation: 'Map to the Investment Committee minutes filing and exposure-limit obligations; the twice-weekly / annual universe review is a binding duty for the PFM.',
      confidence: 96.4,
      basis: 'Para 4 of the in-force PFRDA Master Circular (10 Dec 2025); SPF registration as an NPS PFM.',
      agentAt: t(2025, 12, 12, 9, 40),
      reviewer: 'arvind',
      reviewedAt: t(2025, 12, 15, 14, 12),
      rationale: 'Directly governs SPF’s scheme portfolios; Investment Committee already minutes the review.',
    }),
  },
  {
    id: 'SRC-PFRDA-INV-2025-MAR',
    instrumentId: 'INST-PFRDA-INV-2025-MAR',
    provision: 'Para 4 — approved investment universe & periodic review (28 Mar 2025)',
    title: 'Para 4 — Investment universe (superseded)',
    citation: 'Master Circular on Investment Guidelines, dated 28 Mar 2025 (superseded 10 Dec 2025)',
    sourceExtract:
      'Pension Funds shall invest only in securities forming part of the approved investment universe and shall review the eligible universe at least once a year. (Superseded by the consolidated Master Circular dated 10 December 2025.)',
  },
  // PFRDA ICS
  {
    id: 'SRC-PFRDA-ICS-2024',
    instrumentId: 'INST-PFRDA-ICS-2024',
    provision: 'Policy clause — board-approved ICS policy & cyber crisis management plan',
    title: 'ICS policy & crisis-management plan',
    citation: 'PFRDA ICS Policy Guidelines, 2024',
    sourceExtract:
      'Every intermediary shall put in place a board-approved Information & Cyber Security policy aligned to ISO/IEC 27001 and the NIST Cybersecurity Framework, and shall maintain a cyber crisis management plan with defined roles, escalation and incident reporting to PFRDA.',
    review: review({
      state: 'Under internal review',
      recommendation: 'Map to the half-yearly ICS self-assessment and annual cyber-security audit obligations; requires a board-approved ICS policy.',
      confidence: 88.3,
      basis: 'PFRDA ICS Guidelines 2024 applicability to registered intermediaries.',
      agentAt: t(2026, 6, 2, 10, 15),
      reviewer: 'anjali',
      reviewedAt: t(2026, 6, 6, 16, 30),
      rationale: 'Scope confirmed; cross-checking which controls evidence the board-approval clause before sign-off.',
    }),
  },
  {
    id: 'SRC-PFRDA-ICS-2025',
    instrumentId: 'INST-PFRDA-ICS-2025',
    provision: 'Incident classification & 48-hour intimation',
    title: 'Incident classification & 48h intimation',
    citation: 'Circular PFRDA/2025/05/ICS/01, dated Sept 2025',
    sourceExtract:
      'Cyber security incidents shall be classified as Critical, High, Medium or Low. Subscriber-impacting or personal-data incidents classified Critical/High shall be intimated to the Authority within 48 hours of detection, followed by a detailed report.',
    review: review({
      state: 'Confirmed applies',
      recommendation: 'Map to the quarterly compliance return and incident-intimation duties; the 48-hour clock binds subscriber-impacting incidents.',
      confidence: 94.1,
      basis: 'Circular PFRDA/2025/05/ICS/01; SPF processes subscriber PRAN/KYC data.',
      agentAt: t(2025, 9, 18, 11, 5),
      reviewer: 'anjali',
      reviewedAt: t(2025, 9, 22, 12, 40),
      rationale: 'Already operationalised on the marquee incident track; classification taxonomy adopted.',
    }),
  },
  // Companies Act, 2013
  {
    id: 'SRC-CA-92-5',
    instrumentId: 'INST-CA-2013',
    provision: 'Section 92(5)',
    title: 'Section 92(5) — Annual return default',
    citation: 'Section 92(5), Companies Act, 2013 (as amended by the Companies (Amendment) Act, 2020)',
    sourceExtract:
      'If any company fails to file its annual return under sub-section (4) before the expiry of the period specified therein, such company and its every officer who is in default shall be liable to a penalty of ten thousand rupees and in case of continuing failure, with a further penalty of one hundred rupees for each day during which such failure continues, subject to a maximum of two lakh rupees in case of a company and fifty thousand rupees in case of an officer who is in default.',
    review: review({
      state: 'Confirmed applies',
      recommendation: 'Map to the annual return MGT-7 filing obligation; penalty accrues per day on default.',
      confidence: 95.7,
      basis: 'Section 92(5) applies to every company; SPF is a company incorporated under the Act.',
      agentAt: t(2026, 6, 1, 9, 10),
      reviewer: 'vikram',
      reviewedAt: t(2026, 6, 4, 11, 25),
      rationale: 'Annual return is a standing Company Secretary obligation; confirmed.',
    }),
  },
  {
    id: 'SRC-CA-137-3',
    instrumentId: 'INST-CA-2013',
    provision: 'Section 137(3)',
    title: 'Section 137(3) — Financial statements default',
    citation: 'Section 137(3), Companies Act, 2013 (as amended)',
    sourceExtract:
      'If a company fails to file the copy of the financial statements before the expiry of the period specified therein, the company shall be liable to a penalty of ten thousand rupees and in case of continuing failure, with a further penalty of one hundred rupees for each day, subject to a maximum of two lakh rupees, and the managing director and the Chief Financial Officer, if any, and, in their absence, every director, shall be liable to a penalty of ten thousand rupees and in case of continuing failure, with a further penalty of one hundred rupees for each day, subject to a maximum of fifty thousand rupees.',
    review: review({
      state: 'Confirmed applies',
      recommendation: 'Map to the AOC-4 financial-statement filing obligation; per-day penalty on default.',
      confidence: 94.8,
      basis: 'Section 137(3) applies to every company filing financial statements.',
      agentAt: t(2026, 6, 1, 9, 12),
      reviewer: 'vikram',
      reviewedAt: t(2026, 6, 4, 11, 30),
      rationale: 'Standing filing duty; confirmed against the board calendar.',
    }),
  },
  {
    id: 'SRC-CA-164-2',
    instrumentId: 'INST-CA-2013',
    provision: 'Section 164(2)',
    title: 'Section 164(2) — Director disqualification',
    citation: 'Section 164(2), Companies Act, 2013',
    sourceExtract:
      'No person who is or has been a director of a company which has not filed financial statements or annual returns for any continuous period of three financial years shall be eligible to be re-appointed as a director of that company or appointed in any other company for a period of five years from the date on which the said company fails to do so.',
    review: review({
      state: 'Not applicable',
      recommendation: 'Track as a consequence of three-year filing default; no direct filing obligation to derive.',
      confidence: 61.3,
      basis: 'Section 164(2) triggers only on a continuous three-year filing default.',
      agentAt: t(2026, 6, 1, 9, 14),
      reviewer: 'vikram',
      reviewedAt: t(2026, 6, 5, 10, 5),
      rationale: 'SPF has filed all annual returns and financial statements; the three-year default trigger is not met, so no obligation arises.',
    }),
  },
  {
    id: 'SRC-CA-447',
    instrumentId: 'INST-CA-2013',
    provision: 'Section 447',
    title: 'Section 447 — Punishment for fraud',
    citation: 'Section 447, Companies Act, 2013',
    sourceExtract:
      'Any person who is found to be guilty of fraud involving an amount of at least ten lakh rupees or one per cent of the turnover of the company, whichever is lower, shall be punishable with imprisonment for a term which shall not be less than six months but which may extend to ten years and shall also be liable to fine which shall not be less than the amount involved in the fraud, but which may extend to three times the amount involved in the fraud.',
    review: review({
      state: 'Under internal review',
      recommendation: 'Treat as a fraud-risk consequence provision feeding the whistleblower / fraud-risk controls rather than a filing obligation.',
      confidence: 68.5,
      basis: 'Section 447 is a penal consequence provision, not a periodic filing.',
      agentAt: t(2026, 6, 2, 14, 40),
      reviewer: 'anjali',
      reviewedAt: t(2026, 6, 7, 9, 15),
      rationale: 'Relevant to fraud-risk controls; confirming the mapping target before closing.',
    }),
  },
  {
    id: 'SRC-CA-403',
    instrumentId: 'INST-CA-FEES-2014',
    provision: 'Section 403 r/w Rule 12 (additional fee)',
    title: 'Section 403 — Additional fee on delay',
    citation: 'Section 403 read with the Companies (Registration Offices and Fees) Rules, 2014',
    sourceExtract:
      'Any document required to be submitted, filed, registered or recorded may be so submitted after the time specified on payment of such additional fee as may be prescribed; in case of delay in filing of the annual return (MGT-7) and financial statements (AOC-4), additional fee of one hundred rupees per day is payable until the date of filing.',
    review: review({
      state: 'Confirmed applies',
      recommendation: 'Attach to the MGT-7 and AOC-4 filing obligations as the additional-fee consequence on delay.',
      confidence: 90.2,
      basis: 'Fees Rules 2014 apply to SPF’s ROC filings.',
      agentAt: t(2026, 6, 1, 9, 16),
      reviewer: 'vikram',
      reviewedAt: t(2026, 6, 4, 11, 35),
      rationale: 'Standard additional-fee rule; confirmed alongside the annual filings.',
    }),
  },
  // GST / CGST Act, 2017
  {
    id: 'SRC-CGST-47',
    instrumentId: 'INST-CGST-2017',
    provision: 'Section 47',
    title: 'Section 47 — Late fee for returns',
    citation: 'Section 47, CGST Act, 2017 (read with late-fee notifications under the GST Acts)',
    sourceExtract:
      'Any registered person who fails to furnish the returns required under section 39 by the due date shall pay a late fee of one hundred rupees for every day during which such failure continues, subject to a prescribed maximum — and an equal amount is payable under the SGST Act. For GSTR-3B and GSTR-1 this is reduced by notification to twenty-five rupees per day under each Act (fifty rupees per day in total) for returns with tax liability.',
    review: review({
      state: 'Confirmed applies',
      recommendation: 'Map to the GSTR-3B and GSTR-1 monthly return obligations; late fee accrues per day.',
      confidence: 93.6,
      basis: 'Section 47 applies to every GST-registered person; SPF is registered.',
      agentAt: t(2026, 6, 1, 8, 50),
      reviewer: 'anjali',
      reviewedAt: t(2026, 6, 3, 15, 20),
      rationale: 'GST returns are a standing monthly obligation; confirmed.',
    }),
  },
  {
    id: 'SRC-CGST-50',
    instrumentId: 'INST-CGST-2017',
    provision: 'Section 50(1)',
    title: 'Section 50(1) — Interest on delayed tax',
    citation: 'Section 50(1), CGST Act, 2017 (read with Notification 13/2017-Central Tax)',
    sourceExtract:
      'Every person who is liable to pay tax in accordance with the provisions of this Act or the rules made thereunder, but fails to pay the tax or any part thereof to the Government within the period prescribed, shall for the period for which the tax or any part thereof remains unpaid, pay, on his own, interest at such rate, not exceeding eighteen per cent, as may be notified by the Government.',
    review: review({
      state: 'Recommended',
      recommendation: 'Attach to the GSTR-3B obligation as the interest-on-delay consequence (18% p.a. notified).',
      confidence: 86.9,
      basis: 'Section 50(1) r/w Notification 13/2017-Central Tax.',
      agentAt: t(2026, 6, 8, 10, 30),
    }),
  },
  // CERT-In
  {
    id: 'SRC-CERTIN-2022',
    instrumentId: 'INST-CERTIN-2022',
    provision: 'Direction No. 20(3)/2022 — 6-hour reporting, 180-day logs, NTP sync',
    title: 'Direction 20(3)/2022 — 6-hour reporting',
    citation: 'Direction No. 20(3)/2022-CERT-In, dated 28 Apr 2022',
    sourceExtract:
      'Any service provider, intermediary, data centre, body corporate and Government organisation shall mandatorily report cyber incidents to CERT-In within six hours of noticing such incidents or being brought to notice about such incidents. Logs shall be securely maintained for a rolling period of 180 days within Indian jurisdiction, and ICT systems clocks shall be synchronised to NTP.',
    review: review({
      state: 'Confirmed applies',
      recommendation: 'Map to the cyber incident summary report and log-retention / NTP-sync attestation obligations.',
      confidence: 96.1,
      basis: 'Direction 20(3)/2022 binds every body corporate operating ICT systems in India.',
      agentAt: t(2026, 6, 1, 8, 40),
      reviewer: 'anjali',
      reviewedAt: t(2026, 6, 3, 9, 55),
      rationale: 'Operationalised on the CERT-In clock; 180-day in-India retention evidenced.',
    }),
  },
  {
    id: 'SRC-ITACT-70B',
    instrumentId: 'INST-ITACT-2000',
    provision: 'Section 70B',
    title: 'Section 70B — CERT-In powers & penalty',
    citation: 'Section 70B, Information Technology Act, 2000',
    sourceExtract:
      'The Indian Computer Emergency Response Team shall serve as the national agency for incident response. Any service provider, intermediaries, data centres, body corporate or person who fails to provide the information called for or comply with the directions issued shall be punishable with imprisonment for a term which may extend to one year or with fine which may extend to one lakh rupees or with both.',
    review: review({
      state: 'Recommended',
      recommendation: 'Attach to the CERT-In reporting obligations as the parent power + non-compliance penalty.',
      confidence: 84.6,
      basis: 'Section 70B is the enabling provision for the CERT-In Directions.',
      agentAt: t(2026, 6, 8, 10, 35),
    }),
  },
  // EPF & MP Act, 1952
  {
    id: 'SRC-EPF-6',
    instrumentId: 'INST-EPF-1952',
    provision: 'Section 6 — Contributions and matters which may be provided for in Schemes',
    title: 'Section 6 — Contributions',
    citation: 'Section 6, Employees’ Provident Funds and Miscellaneous Provisions Act, 1952',
    sourceExtract:
      'The contribution which shall be paid by the employer to the Fund shall be ten per cent of the basic wages, dearness allowance and retaining allowance (if any) for the time being payable to each of the employees, and the employee’s contribution shall be equal to the contribution payable by the employer; provided that the Central Government may, by notification, substitute twelve per cent for ten per cent, as applies to the classes of establishments to which SPF belongs.',
    review: review({
      state: 'Recommended',
      recommendation: 'Map to the monthly PF & ESI challan (ECR) obligation; defines the 12% employer/employee contribution base.',
      confidence: 91.7,
      basis: 'Section 6 r/w the contribution-rate notification for covered establishments.',
      agentAt: t(2026, 6, 9, 9, 20),
    }),
  },
  {
    id: 'SRC-EPF-14B',
    instrumentId: 'INST-EPF-1952',
    provision: 'Section 14B (r/w Para 32A of the Scheme)',
    title: 'Section 14B — Damages for default',
    citation: 'Section 14B, Employees’ Provident Funds and Miscellaneous Provisions Act, 1952 (r/w Para 32A of the Scheme)',
    sourceExtract:
      'Where an employer makes default in the payment of any contribution to the Fund, the Central Provident Fund Commissioner or such other officer as may be authorised may recover from the employer by way of penalty such damages, not exceeding the amount of arrears, as may be specified in the Scheme.',
    review: review({
      state: 'Confirmed applies',
      recommendation: 'Attach to the monthly PF & ESI challan obligation as the damages-on-default consequence.',
      confidence: 92.8,
      basis: 'Section 14B applies to SPF as a covered establishment defaulting on contributions.',
      agentAt: t(2026, 6, 2, 9, 5),
      reviewer: 'anjali',
      reviewedAt: t(2026, 6, 5, 13, 45),
      rationale: 'Damages clause confirmed against the PF challan obligation; payroll deposits are timely.',
    }),
  },
  {
    id: 'SRC-EPF-7Q',
    instrumentId: 'INST-EPF-1952',
    provision: 'Section 7Q',
    title: 'Section 7Q — Interest on arrears',
    citation: 'Section 7Q, Employees’ Provident Funds and Miscellaneous Provisions Act, 1952',
    sourceExtract:
      'The employer shall be liable to pay simple interest at the rate of twelve per cent per annum or at such higher rate as may be specified in the Scheme on any amount due from him under this Act from the date on which the amount has become so due till the date of its actual payment.',
    review: review({
      state: 'Confirmed applies',
      recommendation: 'Attach to the monthly PF & ESI challan obligation as the 12% p.a. interest-on-arrears consequence.',
      confidence: 92.1,
      basis: 'Section 7Q applies to any amount due from the employer under the Act.',
      agentAt: t(2026, 6, 2, 9, 7),
      reviewer: 'anjali',
      reviewedAt: t(2026, 6, 5, 13, 48),
      rationale: 'Interest clause confirmed alongside Section 14B for the PF challan.',
    }),
  },
  // Maharashtra Professional Tax Act, 1975 (corrects the earlier mislink to the EPF Act)
  {
    id: 'SRC-PT-3',
    instrumentId: 'INST-PT-MAH-1975',
    provision: 'Section 3 — Levy and charge of tax',
    title: 'Section 3 — Levy of profession tax',
    citation: 'Section 3, Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975',
    sourceExtract:
      'There shall be levied and collected a tax on professions, trades, callings and employments in accordance with the provisions of this Act. Every person engaged in any profession, trade, calling or employment and falling under one or more of the entries in Schedule I shall be liable to pay the tax at the rate mentioned against the class of such persons, subject to the maximum of two thousand five hundred rupees per annum.',
    review: review({
      state: 'Recommended',
      recommendation: 'Map to the professional tax remittance obligation; SPF must deduct PT from employee salaries up to ₹2,500 per annum.',
      confidence: 89.4,
      basis: 'Section 3 r/w Schedule I; SPF employs salaried staff in Maharashtra.',
      agentAt: t(2026, 6, 9, 9, 25),
    }),
  },
  {
    id: 'SRC-PT-6',
    instrumentId: 'INST-PT-MAH-1975',
    provision: 'Section 6 — Returns and payment of tax by employers',
    title: 'Section 6 — Returns & payment',
    citation: 'Section 6, Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975',
    sourceExtract:
      'Every employer registered under this Act shall furnish to the prescribed authority a return in such form, for such periods and by such dates as may be prescribed, showing therein the salaries and wages paid by him and the amount of tax deducted by him in respect thereof, and shall pay the full amount of tax due according to such return.',
    review: review({
      state: 'Needs expert opinion',
      recommendation: 'Map to the professional tax remittance and return obligation; the filing period and form vary by state.',
      confidence: 73.8,
      basis: 'Section 6 prescribes employer PT returns; periodicity is state-specific.',
      agentAt: t(2026, 6, 9, 9, 27),
      reviewer: 'farhan',
      reviewedAt: t(2026, 6, 12, 11, 10),
      rationale: 'SPF has staff across multiple states; engaged external counsel to confirm per-state PT return cadence before mapping.',
    }),
  },
  // DPDP
  {
    id: 'SRC-DPDP-2025',
    instrumentId: 'INST-DPDP-2025',
    provision: 'Section 8(6) r/w DPDP Rules, 2025 (breach intimation)',
    title: 'Section 8(6) — Breach intimation',
    citation: 'Section 8(6), DPDP Act, 2023 r/w the DPDP Rules, 2025 (notified 13 Nov 2025)',
    sourceExtract:
      'In the event of a personal data breach, the Data Fiduciary shall give the Board and each affected Data Principal, intimation of such breach in such form and manner as may be prescribed. Substantive obligations are phased in, with the final compliance date set under the DPDP Rules, 2025.',
    review: review({
      state: 'Needs expert opinion',
      recommendation: 'Map to the consent-reconciliation and DSAR obligations; breach-intimation timing depends on the phased commencement.',
      confidence: 71.2,
      basis: 'Section 8(6) r/w DPDP Rules 2025; phased compliance dates.',
      agentAt: t(2026, 6, 7, 15, 0),
      reviewer: 'priya',
      reviewedAt: t(2026, 6, 11, 10, 20),
      rationale: 'Commencement of substantive obligations is phased; external privacy counsel engaged to confirm the applicable date for SPF.',
    }),
  },
  // Standards (referenced by controls, not obligations — no applicability review)
  {
    id: 'SRC-ISO-37301',
    instrumentId: 'INST-ISO-37301',
    provision: 'Clause 1 (Scope)',
    title: 'Clause 1 — Scope',
    citation: 'ISO 37301:2021, Clause 1 (Scope)',
    sourceExtract:
      'This document specifies requirements and provides guidelines for establishing, developing, implementing, evaluating, maintaining and improving an effective compliance management system within an organization.',
  },
  {
    id: 'SRC-ISO-27001',
    instrumentId: 'INST-ISO-27001',
    provision: 'Clause 1 (Scope)',
    title: 'Clause 1 — Scope',
    citation: 'ISO/IEC 27001:2022, Clause 1 (Scope)',
    sourceExtract:
      'This document specifies the requirements for establishing, implementing, maintaining and continually improving an information security management system within the context of the organization.',
  },
  {
    id: 'SRC-NIST-CSF',
    instrumentId: 'INST-NIST-CSF',
    provision: 'CSF Core — six Functions (Govern, Identify, Protect, Detect, Respond, Recover)',
    title: 'Core — six Functions',
    citation: 'NIST CSF 2.0, dated 26 Feb 2024',
    sourceExtract:
      'The Cybersecurity Framework (CSF) 2.0 provides guidance to industry, government agencies, and other organizations to manage cybersecurity risks. The CSF Core is organized around six Functions: Govern, Identify, Protect, Detect, Respond and Recover.',
  },
  {
    id: 'SRC-PCI-DSS',
    instrumentId: 'INST-PCI-DSS',
    provision: 'Overview — baseline of technical & operational requirements',
    title: 'Overview — baseline requirements',
    citation: 'PCI DSS v4.0, Overview',
    sourceExtract:
      'PCI DSS is a global standard that provides a baseline of technical and operational requirements designed to protect account data. PCI DSS comprises a minimum set of requirements for protecting account data, and may be enhanced by additional controls.',
  },
]

export const INSTRUMENTS_BY_ID: Record<string, SourceInstrument> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.id, i]),
)

export const SOURCES_BY_ID: Record<string, SourceReference> = Object.fromEntries(
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

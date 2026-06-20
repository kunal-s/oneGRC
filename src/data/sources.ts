// OneGRC — Source & Provenance seed (Epic 1).
// Real statutory / standard instruments that records derive from. Extracts are
// short real excerpts held inline; a future document repository slots behind the
// same SourceReference type. ids use the SRC- prefix (A4 realism anchor).
// SourceReference is THE single provenance object — reused by obligations,
// policies, control framework mappings, penalty tiers and (future) Compliance
// Intake. No second source model exists.
import type { Framework, Regulator, SourceReference } from '@/types'
import { ist } from '@/lib/time'

const d = (y: number, m: number, day: number) => ist(y, m, day).toISOString()

export const SOURCES: SourceReference[] = [
  // ── PFRDA ───────────────────────────────────────────────────────────────
  // Worked newer-version case: the 10 Dec 2025 Master Circular consolidated and
  // superseded the 28 Mar 2025 one (PFRDA Act, 2013; effective immediately).
  {
    id: 'SRC-PFRDA-INV-2025',
    documentTitle: 'PFRDA Master Circular on Investment Guidelines for NPS Schemes',
    authority: 'PFRDA',
    instrument: 'PFRDA Master Circular on Investment Guidelines (NPS/UPS/APY Schemes)',
    instrumentType: 'Master Circular',
    provision: 'Para 4 — approved investment universe & periodic review',
    citation: 'Master Circular on Investment Guidelines, dated 10 Dec 2025 (para 4 — universe & review)',
    dateOfIssue: d(2025, 12, 10),
    effectiveDate: d(2025, 12, 10),
    version: 'v2025.12',
    supersedesId: 'SRC-PFRDA-INV-2025-MAR',
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.pfrda.org.in/web/pfrda/regulatory-framework/master-circulars/active-master-circulars',
    sourceExtract:
      'Pension Funds shall invest only in securities forming part of the approved investment universe, and shall review the actively invested portfolio at least twice a week and the full eligible universe at least once a year, recording the review in the minutes of the Investment Committee. This Master Circular consolidates and supersedes the earlier Master Circular dated 28 March 2025.',
    attachedDocument: {
      filename: 'PFRDA-MC-Investment-Guidelines-10Dec2025.pdf',
      label: 'Master Circular (PDF)',
      capturedAt: d(2025, 12, 11),
      sizeLabel: '438 KB',
    },
  },
  {
    id: 'SRC-PFRDA-INV-2025-MAR',
    documentTitle: 'PFRDA Master Circular on Investment Guidelines for NPS Schemes (28 Mar 2025 — superseded)',
    authority: 'PFRDA',
    instrument: 'PFRDA Master Circular on Investment Guidelines (NPS/UPS/APY Schemes)',
    instrumentType: 'Master Circular',
    provision: 'Para 4 — approved investment universe & periodic review',
    citation: 'Master Circular on Investment Guidelines, dated 28 Mar 2025 (superseded 10 Dec 2025)',
    dateOfIssue: d(2025, 3, 28),
    effectiveDate: d(2025, 3, 28),
    version: 'v2025.03',
    supersededById: 'SRC-PFRDA-INV-2025',
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.pfrda.org.in/web/pfrda/regulatory-framework/master-circulars',
    sourceExtract:
      'Pension Funds shall invest only in securities forming part of the approved investment universe and shall review the eligible universe at least once a year. (Superseded by the consolidated Master Circular dated 10 December 2025.)',
    attachedDocument: {
      filename: 'PFRDA-MC-Investment-Guidelines-28Mar2025.pdf',
      label: 'Master Circular (PDF) — prior version',
      capturedAt: d(2025, 4, 2),
      sizeLabel: '402 KB',
    },
  },
  {
    id: 'SRC-PFRDA-ICS-2024',
    documentTitle: 'PFRDA Guidelines on Information & Cyber Security for Intermediaries, 2024',
    authority: 'PFRDA',
    instrument: 'PFRDA Information & Cyber Security (ICS) Guidelines, 2024',
    instrumentType: 'Standard',
    provision: 'Policy clause — board-approved ICS policy & cyber crisis management plan',
    citation: 'PFRDA ICS Policy Guidelines, 2024',
    dateOfIssue: d(2024, 4, 1),
    effectiveDate: d(2024, 4, 1),
    version: '2024 edition',
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.pfrda.org.in/index1.cshtml?lsid=237',
    sourceExtract:
      'Every intermediary shall put in place a board-approved Information & Cyber Security policy aligned to ISO/IEC 27001 and the NIST Cybersecurity Framework, and shall maintain a cyber crisis management plan with defined roles, escalation and incident reporting to PFRDA.',
  },
  {
    id: 'SRC-PFRDA-ICS-2025',
    documentTitle: 'PFRDA Circular — Cyber Security Incident Classification & Reporting',
    authority: 'PFRDA',
    instrument: 'PFRDA Circular on Cyber Security Incident Classification & Reporting',
    instrumentType: 'Circular',
    provision: 'Incident classification & 48-hour intimation',
    citation: 'Circular PFRDA/2025/05/ICS/01, dated Sept 2025',
    referenceNumber: 'PFRDA/2025/05/ICS/01',
    dateOfIssue: d(2025, 9, 15),
    effectiveDate: d(2025, 9, 15),
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.pfrda.org.in/index1.cshtml?lsid=237',
    sourceExtract:
      'Cyber security incidents shall be classified as Critical, High, Medium or Low. Subscriber-impacting or personal-data incidents classified Critical/High shall be intimated to the Authority within 48 hours of detection, followed by a detailed report.',
  },
  // ── MCA / Companies Act, 2013 ────────────────────────────────────────────
  {
    id: 'SRC-CA-92-5',
    documentTitle: 'Companies Act, 2013 — Section 92(5) (Annual Return)',
    authority: 'MCA',
    instrument: 'Companies Act, 2013',
    instrumentType: 'Act',
    provision: 'Section 92(5)',
    citation: 'Section 92(5), Companies Act, 2013 (as amended by the Companies (Amendment) Act, 2020)',
    dateOfIssue: d(2013, 8, 29),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/acts.html',
    sourceExtract:
      'If any company fails to file its annual return under sub-section (4) before the expiry of the period specified therein, such company and its every officer who is in default shall be liable to a penalty of ten thousand rupees and in case of continuing failure, with a further penalty of one hundred rupees for each day during which such failure continues, subject to a maximum of two lakh rupees in case of a company and fifty thousand rupees in case of an officer who is in default.',
  },
  {
    id: 'SRC-CA-137-3',
    documentTitle: 'Companies Act, 2013 — Section 137(3) (Filing of Financial Statements)',
    authority: 'MCA',
    instrument: 'Companies Act, 2013',
    instrumentType: 'Act',
    provision: 'Section 137(3)',
    citation: 'Section 137(3), Companies Act, 2013 (as amended)',
    dateOfIssue: d(2013, 8, 29),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/acts.html',
    sourceExtract:
      'If a company fails to file the copy of the financial statements before the expiry of the period specified therein, the company shall be liable to a penalty of ten thousand rupees and in case of continuing failure, with a further penalty of one hundred rupees for each day, subject to a maximum of two lakh rupees, and the managing director and the Chief Financial Officer, if any, and, in their absence, every director, shall be liable to a penalty of ten thousand rupees and in case of continuing failure, with a further penalty of one hundred rupees for each day, subject to a maximum of fifty thousand rupees.',
  },
  {
    id: 'SRC-CA-164-2',
    documentTitle: 'Companies Act, 2013 — Section 164(2) (Disqualification of Directors)',
    authority: 'MCA',
    instrument: 'Companies Act, 2013',
    instrumentType: 'Act',
    provision: 'Section 164(2)',
    citation: 'Section 164(2), Companies Act, 2013',
    dateOfIssue: d(2013, 8, 29),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/acts.html',
    sourceExtract:
      'No person who is or has been a director of a company which has not filed financial statements or annual returns for any continuous period of three financial years shall be eligible to be re-appointed as a director of that company or appointed in any other company for a period of five years from the date on which the said company fails to do so.',
  },
  {
    id: 'SRC-CA-447',
    documentTitle: 'Companies Act, 2013 — Section 447 (Punishment for Fraud)',
    authority: 'MCA',
    instrument: 'Companies Act, 2013',
    instrumentType: 'Act',
    provision: 'Section 447',
    citation: 'Section 447, Companies Act, 2013',
    dateOfIssue: d(2013, 8, 29),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/acts.html',
    sourceExtract:
      'Any person who is found to be guilty of fraud involving an amount of at least ten lakh rupees or one per cent of the turnover of the company, whichever is lower, shall be punishable with imprisonment for a term which shall not be less than six months but which may extend to ten years and shall also be liable to fine which shall not be less than the amount involved in the fraud, but which may extend to three times the amount involved in the fraud.',
  },
  {
    id: 'SRC-CA-403',
    documentTitle: 'Companies Act, 2013 — Section 403 r/w Fees Rules (Additional Fee)',
    authority: 'MCA',
    instrument: 'Companies (Registration Offices and Fees) Rules, 2014',
    instrumentType: 'Rules',
    provision: 'Section 403 r/w Rule 12 (additional fee)',
    citation: 'Section 403 read with the Companies (Registration Offices and Fees) Rules, 2014',
    dateOfIssue: d(2014, 3, 31),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/rules.html',
    sourceExtract:
      'Any document required to be submitted, filed, registered or recorded may be so submitted after the time specified on payment of such additional fee as may be prescribed; in case of delay in filing of the annual return (MGT-7) and financial statements (AOC-4), additional fee of one hundred rupees per day is payable until the date of filing.',
  },
  // ── GST / CBIC ───────────────────────────────────────────────────────────
  {
    id: 'SRC-CGST-47',
    documentTitle: 'CGST Act, 2017 — Section 47 (Late Fee for Returns)',
    authority: 'CBIC',
    instrument: 'Central Goods and Services Tax Act, 2017',
    instrumentType: 'Act',
    provision: 'Section 47',
    citation: 'Section 47, CGST Act, 2017 (read with late-fee notifications under the GST Acts)',
    dateOfIssue: d(2017, 4, 12),
    sourceChannel: 'Regulator site',
    sourceLink: 'https://cbic-gst.gov.in/CGST-bill-e.html',
    sourceExtract:
      'Any registered person who fails to furnish the returns required under section 39 by the due date shall pay a late fee of one hundred rupees for every day during which such failure continues, subject to a prescribed maximum — and an equal amount is payable under the SGST Act. For GSTR-3B and GSTR-1 this is reduced by notification to twenty-five rupees per day under each Act (fifty rupees per day in total) for returns with tax liability.',
  },
  {
    id: 'SRC-CGST-50',
    documentTitle: 'CGST Act, 2017 — Section 50 (Interest on Delayed Payment of Tax)',
    authority: 'CBIC',
    instrument: 'Central Goods and Services Tax Act, 2017',
    instrumentType: 'Act',
    provision: 'Section 50(1)',
    citation: 'Section 50(1), CGST Act, 2017 (read with Notification 13/2017-Central Tax)',
    referenceNumber: '13/2017-Central Tax',
    dateOfIssue: d(2017, 4, 12),
    sourceChannel: 'Regulator site',
    sourceLink: 'https://cbic-gst.gov.in/CGST-bill-e.html',
    sourceExtract:
      'Every person who is liable to pay tax in accordance with the provisions of this Act or the rules made thereunder, but fails to pay the tax or any part thereof to the Government within the period prescribed, shall for the period for which the tax or any part thereof remains unpaid, pay, on his own, interest at such rate, not exceeding eighteen per cent, as may be notified by the Government.',
  },
  // ── CERT-In / MeitY ──────────────────────────────────────────────────────
  {
    id: 'SRC-CERTIN-2022',
    documentTitle: 'CERT-In Directions under Section 70B(6) of the IT Act, 2000',
    authority: 'CERT-In',
    instrument: 'CERT-In Directions, 2022 (under Section 70B(6), IT Act, 2000)',
    instrumentType: 'Direction',
    provision: 'Direction No. 20(3)/2022 — 6-hour incident reporting, 180-day logs, NTP sync',
    citation: 'Direction No. 20(3)/2022-CERT-In, dated 28 Apr 2022',
    referenceNumber: '20(3)/2022',
    dateOfIssue: d(2022, 4, 28),
    effectiveDate: d(2022, 6, 27),
    sourceChannel: 'Regulator site',
    sourceLink: 'https://www.cert-in.org.in/Directions70B.jsp',
    sourceExtract:
      'Any service provider, intermediary, data centre, body corporate and Government organisation shall mandatorily report cyber incidents to CERT-In within six hours of noticing such incidents or being brought to notice about such incidents. Logs shall be securely maintained for a rolling period of 180 days within Indian jurisdiction, and ICT systems clocks shall be synchronised to NTP.',
  },
  {
    id: 'SRC-ITACT-70B',
    documentTitle: 'Information Technology Act, 2000 — Section 70B (CERT-In)',
    authority: 'MeitY',
    instrument: 'Information Technology Act, 2000',
    instrumentType: 'Act',
    provision: 'Section 70B',
    citation: 'Section 70B, Information Technology Act, 2000',
    dateOfIssue: d(2009, 10, 27),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.meity.gov.in/content/information-technology-act-2000',
    sourceExtract:
      'The Indian Computer Emergency Response Team shall serve as the national agency for incident response. Any service provider, intermediaries, data centres, body corporate or person who fails to provide the information called for or comply with the directions issued shall be punishable with imprisonment for a term which may extend to one year or with fine which may extend to one lakh rupees or with both.',
  },
  // ── EPFO ─────────────────────────────────────────────────────────────────
  {
    id: 'SRC-EPF-14B',
    documentTitle: 'EPF & MP Act, 1952 — Section 14B (Damages for Default)',
    authority: 'EPFO',
    instrument: 'Employees’ Provident Funds and Miscellaneous Provisions Act, 1952',
    instrumentType: 'Act',
    provision: 'Section 14B (r/w Para 32A of the Scheme)',
    citation: 'Section 14B, Employees’ Provident Funds and Miscellaneous Provisions Act, 1952 (r/w Para 32A of the Scheme)',
    dateOfIssue: d(1952, 3, 4),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.epfindia.gov.in/site_en/Acts.php',
    sourceExtract:
      'Where an employer makes default in the payment of any contribution to the Fund, the Central Provident Fund Commissioner or such other officer as may be authorised may recover from the employer by way of penalty such damages, not exceeding the amount of arrears, as may be specified in the Scheme.',
  },
  {
    id: 'SRC-EPF-7Q',
    documentTitle: 'EPF & MP Act, 1952 — Section 7Q (Interest on Arrears)',
    authority: 'EPFO',
    instrument: 'Employees’ Provident Funds and Miscellaneous Provisions Act, 1952',
    instrumentType: 'Act',
    provision: 'Section 7Q',
    citation: 'Section 7Q, Employees’ Provident Funds and Miscellaneous Provisions Act, 1952',
    dateOfIssue: d(1952, 3, 4),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.epfindia.gov.in/site_en/Acts.php',
    sourceExtract:
      'The employer shall be liable to pay simple interest at the rate of twelve per cent per annum or at such higher rate as may be specified in the Scheme on any amount due from him under this Act from the date on which the amount has become so due till the date of its actual payment.',
  },
  // ── DPDP ─────────────────────────────────────────────────────────────────
  {
    id: 'SRC-DPDP-2025',
    documentTitle: 'Digital Personal Data Protection Act, 2023 & DPDP Rules, 2025',
    authority: 'MeitY',
    instrument: 'Digital Personal Data Protection Act, 2023 r/w DPDP Rules, 2025',
    instrumentType: 'Rules',
    provision: 'Section 8(6) r/w DPDP Rules, 2025 (breach intimation)',
    citation: 'Section 8(6), DPDP Act, 2023 r/w the DPDP Rules, 2025 (notified 13 Nov 2025)',
    dateOfIssue: d(2025, 11, 13),
    sourceChannel: 'Official Gazette',
    sourceLink: 'https://www.meity.gov.in/data-protection-framework',
    sourceExtract:
      'In the event of a personal data breach, the Data Fiduciary shall give the Board and each affected Data Principal, intimation of such breach in such form and manner as may be prescribed. Substantive obligations are phased in, with the final compliance date set under the DPDP Rules, 2025.',
  },
  // ── Standards (ISO / NIST / PCI) ─────────────────────────────────────────
  {
    id: 'SRC-ISO-37301',
    documentTitle: 'ISO 37301:2021 — Compliance Management Systems',
    authority: 'ISO',
    instrument: 'ISO 37301:2021 — Compliance Management Systems',
    instrumentType: 'Standard',
    provision: 'Clause 1 (Scope)',
    citation: 'ISO 37301:2021, Clause 1 (Scope)',
    dateOfIssue: d(2021, 4, 13),
    version: '2021 edition',
    sourceChannel: 'Content feed',
    sourceLink: 'https://www.iso.org/standard/75080.html',
    sourceExtract:
      'This document specifies requirements and provides guidelines for establishing, developing, implementing, evaluating, maintaining and improving an effective compliance management system within an organization.',
  },
  {
    id: 'SRC-ISO-27001',
    documentTitle: 'ISO/IEC 27001:2022 — Information Security Management Systems',
    authority: 'ISO',
    instrument: 'ISO/IEC 27001:2022 — Information Security Management Systems',
    instrumentType: 'Standard',
    provision: 'Clause 1 (Scope)',
    citation: 'ISO/IEC 27001:2022, Clause 1 (Scope)',
    dateOfIssue: d(2022, 10, 25),
    version: '2022 edition',
    sourceChannel: 'Content feed',
    sourceLink: 'https://www.iso.org/standard/27001',
    sourceExtract:
      'This document specifies the requirements for establishing, implementing, maintaining and continually improving an information security management system within the context of the organization.',
    attachedDocument: {
      filename: 'ISO-IEC-27001-2022.pdf',
      label: 'Standard (licensed copy)',
      capturedAt: d(2025, 2, 18),
      sizeLabel: '1.2 MB',
    },
  },
  {
    id: 'SRC-NIST-CSF',
    documentTitle: 'NIST Cybersecurity Framework (CSF) 2.0',
    authority: 'NIST',
    instrument: 'NIST Cybersecurity Framework (CSF) 2.0',
    instrumentType: 'Standard',
    provision: 'CSF Core — six Functions (Govern, Identify, Protect, Detect, Respond, Recover)',
    citation: 'NIST CSF 2.0, dated 26 Feb 2024',
    dateOfIssue: d(2024, 2, 26),
    version: '2.0',
    sourceChannel: 'Content feed',
    sourceLink: 'https://www.nist.gov/cyberframework',
    sourceExtract:
      'The Cybersecurity Framework (CSF) 2.0 provides guidance to industry, government agencies, and other organizations to manage cybersecurity risks. The CSF Core is organized around six Functions: Govern, Identify, Protect, Detect, Respond and Recover.',
  },
  {
    id: 'SRC-PCI-DSS',
    documentTitle: 'PCI DSS v4.0 — Payment Card Industry Data Security Standard',
    authority: 'PCI SSC',
    instrument: 'PCI DSS v4.0 — Payment Card Industry Data Security Standard',
    instrumentType: 'Standard',
    provision: 'Overview — baseline of technical & operational requirements',
    citation: 'PCI DSS v4.0, Overview',
    dateOfIssue: d(2022, 3, 31),
    version: 'v4.0',
    sourceChannel: 'Content feed',
    sourceLink: 'https://www.pcisecuritystandards.org/document_library/',
    sourceExtract:
      'PCI DSS is a global standard that provides a baseline of technical and operational requirements designed to protect account data. PCI DSS comprises a minimum set of requirements for protecting account data, and may be enhanced by additional controls.',
  },
]

export const SOURCES_BY_ID: Record<string, SourceReference> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
)

/** Default instrument for an obligation's regulator (overridable with specifics). */
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

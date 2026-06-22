import type { Person, RoleKey } from '@/types'

// The named 15-person roster (A2). ids are short, stable handles.
// Each roster person carries a primary persona (role). Multiple people back one
// persona; the switcher (ROLES below) picks one representative per persona.
export const PEOPLE: Person[] = [
  { id: 'meera', name: 'Meera Krishnan', title: 'Chief Risk Officer', role: 'EXEC', initials: 'MK', lod: '2LoD', email: 'meera.krishnan@sankalppf.in' },
  { id: 'rajesh', name: 'Rajesh Iyer', title: 'Chief Information Security Officer', role: 'CTRLOWNER', initials: 'RI', lod: '2LoD', email: 'rajesh.iyer@sankalppf.in' },
  { id: 'anjali', name: 'Anjali Deshmukh', title: 'Head of Compliance', role: 'CCO', initials: 'AD', lod: '2LoD', email: 'anjali.deshmukh@sankalppf.in' },
  { id: 'vikram', name: 'Vikram Rao', title: 'Company Secretary', role: 'CCO', initials: 'VR', lod: '2LoD', email: 'vikram.rao@sankalppf.in' },
  { id: 'sunita', name: 'Sunita Menon', title: 'Head of Internal Audit', role: 'AUDITOR', initials: 'SM', lod: '3LoD', email: 'sunita.menon@sankalppf.in' },
  { id: 'arvind', name: 'Arvind Patel', title: 'Head of Investment Compliance', role: 'CCO', initials: 'AP', lod: '2LoD', email: 'arvind.patel@sankalppf.in' },
  { id: 'karthik', name: 'Karthik Nair', title: 'SecOps Lead', role: 'CTRLOWNER', initials: 'KN', lod: '1LoD', email: 'karthik.nair@sankalppf.in' },
  { id: 'priya', name: 'Priya Sharma', title: 'DPO / Privacy Lead', role: 'CCO', initials: 'PS', lod: '2LoD', email: 'priya.sharma@sankalppf.in' },
  { id: 'rohan', name: 'Rohan Gupta', title: 'IT Controls', role: 'CTRLOWNER', initials: 'RG', lod: '1LoD', email: 'rohan.gupta@sankalppf.in' },
  { id: 'deepa', name: 'Deepa Iyer', title: 'GST / Tax', role: 'ANALYST', initials: 'DI', lod: '1LoD', email: 'deepa.iyer@sankalppf.in' },
  { id: 'farhan', name: 'Farhan Ali', title: 'Labour & Secretarial', role: 'ANALYST', initials: 'FA', lod: '1LoD', email: 'farhan.ali@sankalppf.in' },
  { id: 'neha', name: 'Neha Joshi', title: 'SOC Analyst', role: 'CTRLOWNER', initials: 'NJ', lod: '1LoD', email: 'neha.joshi@sankalppf.in' },
  { id: 'sanjay', name: 'Sanjay Verma', title: 'Investment Risk', role: 'RISK', initials: 'SV', lod: '1LoD', email: 'sanjay.verma@sankalppf.in' },
  { id: 'lakshmi', name: 'Lakshmi Rao', title: 'Internal Auditor', role: 'AUDITOR', initials: 'LR', lod: '3LoD', email: 'lakshmi.rao@sankalppf.in' },
  { id: 'imran', name: 'Imran Sheikh', title: 'Platform Administrator', role: 'ADMIN', initials: 'IS', lod: '2LoD', email: 'imran.sheikh@sankalppf.in' },
]

export const PEOPLE_BY_ID: Record<string, Person> = Object.fromEntries(
  PEOPLE.map((p) => [p.id, p]),
)

export function personName(id: string): string {
  return PEOPLE_BY_ID[id]?.name ?? id
}

// The persona switcher. Order is the demo altitude order; EXEC is the default.
// `label` is the persona; `person` is the representative whose queue/identity loads.
export const ROLES: { key: RoleKey; person: string; label: string }[] = [
  { key: 'EXEC', person: 'meera', label: 'Executive' },
  { key: 'RISK', person: 'sanjay', label: 'Risk Manager' },
  { key: 'CCO', person: 'anjali', label: 'Compliance Manager' },
  { key: 'ANALYST', person: 'deepa', label: 'Compliance Analyst' },
  { key: 'CTRLOWNER', person: 'rajesh', label: 'Control Owner' },
  { key: 'AUDITOR', person: 'sunita', label: 'Auditor' },
  { key: 'ADMIN', person: 'imran', label: 'Administrator' },
]

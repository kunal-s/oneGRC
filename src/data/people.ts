import type { Person, RoleKey } from '@/types'

// The named 15-person roster (A2). ids are short, stable handles.
export const PEOPLE: Person[] = [
  { id: 'meera', name: 'Meera Krishnan', title: 'Chief Risk Officer', role: 'CRO', initials: 'MK', lod: '2LoD', email: 'meera.krishnan@sankalppf.in' },
  { id: 'rajesh', name: 'Rajesh Iyer', title: 'Chief Information Security Officer', role: 'CISO', initials: 'RI', lod: '2LoD', email: 'rajesh.iyer@sankalppf.in' },
  { id: 'anjali', name: 'Anjali Deshmukh', title: 'Head of Compliance', role: 'COMPLIANCE', initials: 'AD', lod: '2LoD', email: 'anjali.deshmukh@sankalppf.in' },
  { id: 'vikram', name: 'Vikram Rao', title: 'Company Secretary', role: 'COSEC', initials: 'VR', lod: '2LoD', email: 'vikram.rao@sankalppf.in' },
  { id: 'sunita', name: 'Sunita Menon', title: 'Head of Internal Audit', role: 'AUDIT', initials: 'SM', lod: '3LoD', email: 'sunita.menon@sankalppf.in' },
  { id: 'arvind', name: 'Arvind Patel', title: 'Head of Investment Compliance', role: 'INVCOMP', initials: 'AP', lod: '2LoD', email: 'arvind.patel@sankalppf.in' },
  { id: 'karthik', name: 'Karthik Nair', title: 'SecOps Lead', role: 'CISO', initials: 'KN', lod: '1LoD', email: 'karthik.nair@sankalppf.in' },
  { id: 'priya', name: 'Priya Sharma', title: 'DPO / Privacy Lead', role: 'COMPLIANCE', initials: 'PS', lod: '2LoD', email: 'priya.sharma@sankalppf.in' },
  { id: 'rohan', name: 'Rohan Gupta', title: 'IT Controls', role: 'CISO', initials: 'RG', lod: '1LoD', email: 'rohan.gupta@sankalppf.in' },
  { id: 'deepa', name: 'Deepa Iyer', title: 'GST / Tax', role: 'COMPLIANCE', initials: 'DI', lod: '1LoD', email: 'deepa.iyer@sankalppf.in' },
  { id: 'farhan', name: 'Farhan Ali', title: 'Labour & Secretarial', role: 'COSEC', initials: 'FA', lod: '1LoD', email: 'farhan.ali@sankalppf.in' },
  { id: 'neha', name: 'Neha Joshi', title: 'SOC Analyst', role: 'CISO', initials: 'NJ', lod: '1LoD', email: 'neha.joshi@sankalppf.in' },
  { id: 'sanjay', name: 'Sanjay Verma', title: 'Investment Risk', role: 'INVCOMP', initials: 'SV', lod: '1LoD', email: 'sanjay.verma@sankalppf.in' },
  { id: 'lakshmi', name: 'Lakshmi Rao', title: 'Internal Auditor', role: 'AUDIT', initials: 'LR', lod: '3LoD', email: 'lakshmi.rao@sankalppf.in' },
  { id: 'imran', name: 'Imran Sheikh', title: 'Vendor / TPRM', role: 'INVCOMP', initials: 'IS', lod: '1LoD', email: 'imran.sheikh@sankalppf.in' },
]

export const PEOPLE_BY_ID: Record<string, Person> = Object.fromEntries(
  PEOPLE.map((p) => [p.id, p]),
)

export function personName(id: string): string {
  return PEOPLE_BY_ID[id]?.name ?? id
}

export const ROLES: { key: RoleKey; person: string; label: string }[] = [
  { key: 'CRO', person: 'meera', label: 'Chief Risk Officer' },
  { key: 'CISO', person: 'rajesh', label: 'CISO' },
  { key: 'COMPLIANCE', person: 'anjali', label: 'Head of Compliance' },
  { key: 'COSEC', person: 'vikram', label: 'Company Secretary' },
  { key: 'AUDIT', person: 'sunita', label: 'Head of Internal Audit' },
  { key: 'INVCOMP', person: 'arvind', label: 'Head of Investment Compliance' },
]

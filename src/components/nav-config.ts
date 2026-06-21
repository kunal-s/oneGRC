import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Inbox, ShieldAlert, Library, Activity, FileText,
  Siren, Timer, CalendarClock, GitPullRequestArrow, Landmark, DatabaseZap,
  ClipboardCheck, Wrench, FolderArchive, Plug, Settings, Scale,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}
export interface NavGroup {
  header?: string
  items: NavItem[]
}

// EXACT order & grouping from A5. Group headers are literal.
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Home — Board Cockpit', icon: LayoutDashboard, end: true },
      { to: '/queue', label: 'My Queue', icon: Inbox },
    ],
  },
  {
    header: 'RISK & CONTROL',
    items: [
      { to: '/risks', label: 'Risk Register', icon: ShieldAlert },
      { to: '/controls', label: 'Control Library', icon: Library },
      { to: '/ccm', label: 'Continuous Control Monitoring', icon: Activity },
      { to: '/policies', label: 'Policies', icon: FileText },
    ],
  },
  {
    header: 'INCIDENTS & CLOCKS',
    items: [
      { to: '/incidents', label: 'Incidents', icon: Siren },
      { to: '/clocks', label: 'Regulator Clocks', icon: Timer },
    ],
  },
  {
    header: 'COMPLIANCE',
    items: [
      { to: '/obligations', label: 'Obligations & Calendar', icon: CalendarClock },
      { to: '/reg-change', label: 'Regulatory Change', icon: GitPullRequestArrow },
      { to: '/sources', label: 'Source Library', icon: Scale },
      { to: '/pfrda', label: 'PFRDA Pack', icon: Landmark },
      { to: '/dpdp', label: 'DPDP / Data Governance', icon: DatabaseZap },
    ],
  },
  {
    header: 'AUDIT & ASSURANCE',
    items: [
      { to: '/audits', label: 'Audits', icon: ClipboardCheck },
      { to: '/issues', label: 'Issues & Remediation', icon: Wrench },
      { to: '/evidence', label: 'Evidence Vault', icon: FolderArchive },
    ],
  },
]

export const NAV_BOTTOM: NavItem[] = [
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  ...NAV_BOTTOM,
]

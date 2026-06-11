import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Search, Scale, Eraser, FileLock2, ClipboardList, CheckCircle2, Lock, Download, ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getDsar } from '@/data'
import { PEOPLE_BY_ID } from '@/data/people'
import { fmtIST, fmtDate } from '@/lib/time'
import { maskPran } from '@/lib/format'
import { useApp } from '@/store'
import { ComingSoon } from './ComingSoon'

interface FoundRow {
  store: string
  category: string
  retention: string
  action: 'Retain (statutory)' | 'Erased' | 'Anonymised'
}

const ERASURE_FINDINGS: FoundRow[] = [
  { store: 'CRA (Protean)', category: 'Pension records — PRAN, contributions, NAV history', retention: 'PFRDA — 10-year record-keeping', action: 'Retain (statutory)' },
  { store: 'KYC DB', category: 'KYC documents — PAN, Aadhaar ref, address proof', retention: 'PMLA / KYC — statutory retention', action: 'Retain (statutory)' },
  { store: 'Fund Accounting', category: 'Transaction ledger entries', retention: 'Companies Act — 8 years', action: 'Retain (statutory)' },
  { store: 'Security logs (Splunk)', category: 'Access logs referencing PRAN', retention: 'CERT-In — 180-day in-India log retention', action: 'Retain (statutory)' },
  { store: 'CRM', category: 'Marketing profile & contact preferences', retention: 'No statutory basis — consent revoked', action: 'Erased' },
  { store: 'CRM', category: 'Grievance / interaction history', retention: 'Retain aggregate only', action: 'Anonymised' },
]

const ACTION_CLS: Record<FoundRow['action'], string> = {
  'Retain (statutory)': 'bg-medium-soft text-medium',
  Erased: 'bg-ok-soft text-ok',
  Anonymised: 'bg-info-soft text-info',
}

export function DsarDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const openDrawer = useApp((s) => s.openDrawer)
  const dsar = id ? getDsar(id) : undefined

  if (!dsar) return <ComingSoon title="DSAR not found" />

  const owner = PEOPLE_BY_ID[dsar.owner]
  const isErasure = dsar.type === 'Erasure'

  const steps = isErasure
    ? [
        { icon: Search, title: 'Locate', detail: '6 data categories found across CRA, KYC DB, Fund Accounting, CRM and security logs.', done: true },
        { icon: Scale, title: 'Check retention', detail: '4 categories under statutory hold (PFRDA 10-yr, PMLA, Companies Act, CERT-In 180-day logs); 2 erasable.', done: true },
        { icon: Eraser, title: "Erase what's allowed", detail: 'CRM marketing profile purged; grievance history anonymised; marketing consent revoked.', done: true },
        { icon: FileLock2, title: 'Log (immutable)', detail: 'Erasure action written to the immutable DSAR log; evidence captured.', done: true },
        { icon: ClipboardList, title: 'Update register & generate audit record', detail: 'Consent ledger updated; audit record ATR-DSAR-2026-0047 generated. Pending DPO sign-off.', done: false },
      ]
    : [
        { icon: Search, title: 'Locate', detail: 'Subject data located across CRA and KYC stores.', done: true },
        { icon: ShieldCheck, title: 'Verify identity', detail: 'Data-principal identity verified before disclosure.', done: true },
        { icon: ClipboardList, title: 'Fulfil & log', detail: `${dsar.type} request actioned and recorded on the DSAR register.`, done: dsar.status === 'Fulfilled' },
      ]

  return (
    <div>
      <button onClick={() => navigate('/dpdp')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> DPDP / Data Governance
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{dsar.id}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">{dsar.type}</span>
            <span className="text-muted-foreground">· DPDP data-principal request</span>
          </span>
        }
        title={isErasure ? 'Erasure request — NPS exit (retention override)' : `${dsar.type} request`}
        description={dsar.note}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={dsar.status} />
            <Button size="sm" onClick={() => pushToast({ title: 'Decision approved', description: `${dsar.id} — partial erasure decision signed off by DPO.`, variant: 'success' })}>
              <CheckCircle2 className="size-4" /> Approve decision
            </Button>
          </div>
        }
      />

      {/* subject strip */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs">
        <span><span className="text-muted-foreground">Data principal (PRAN):</span> <span className="font-mono font-medium text-foreground">{maskPran(dsar.pran)}</span></span>
        <span className="inline-flex items-center gap-1.5"><span className="text-muted-foreground">Handler:</span> <Avatar id={dsar.owner} size={18} /> {owner.name} ({owner.title})</span>
        <span><span className="text-muted-foreground">Raised:</span> {fmtDate(dsar.raisedAt)}</span>
        <span><span className="text-muted-foreground">Due:</span> {fmtDate(dsar.dueDate)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* the flow */}
          <div className="card-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {isErasure ? 'Erasure-vs-retention workflow' : 'Request workflow'}
            </h3>
            <ol className="space-y-0">
              {steps.map((s, i) => {
                const Icon = s.icon
                const last = i === steps.length - 1
                return (
                  <li key={s.title} className="relative flex gap-3 pb-4 last:pb-0">
                    {!last && <span className="absolute left-[15px] top-8 h-full w-px bg-border" />}
                    <div className={cn('z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background', s.done ? 'bg-ok-soft text-ok' : 'bg-medium-soft text-medium')}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{i + 1}. {s.title}</span>
                        {s.done ? <CheckCircle2 className="size-3.5 text-ok" /> : <StatusChip status="In progress" tone="warn" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          {/* data found / decision table (erasure) */}
          {isErasure && (
            <div className="card-surface overflow-hidden">
              <div className="border-b border-border px-4 py-2.5">
                <h3 className="text-sm font-semibold text-foreground">Located data &amp; retention decision</h3>
                <p className="text-2xs text-muted-foreground">Statutory record-keeping overrides erasure for pension data; only non-statutory CRM data is erased.</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2">Store</th>
                    <th className="px-4 py-2">Data category</th>
                    <th className="px-4 py-2">Retention basis</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ERASURE_FINDINGS.map((f, i) => (
                    <tr key={i} className="border-b border-border/70 last:border-0">
                      <td className="px-4 py-2 text-xs font-medium text-foreground">{f.store}</td>
                      <td className="px-4 py-2 text-xs text-foreground">{f.category}</td>
                      <td className="px-4 py-2 text-2xs text-muted-foreground">{f.retention}</td>
                      <td className="px-4 py-2">
                        <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium', ACTION_CLS[f.action])}>
                          {f.action === 'Retain (statutory)' ? <Lock className="size-3" /> : f.action === 'Erased' ? <Eraser className="size-3" /> : null}
                          {f.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* generated audit record */}
          <div className="card-surface p-3.5">
            <div className="mb-2 flex items-center gap-1.5">
              <FileLock2 className="size-4 text-ok" />
              <h3 className="text-sm font-semibold text-foreground">Audit record generated</h3>
            </div>
            <div className="rounded-md border border-border bg-background p-2.5">
              <div className="font-mono text-2xs font-semibold text-info">ATR-{dsar.id}</div>
              <div className="mt-0.5 text-xs text-foreground">Immutable record of the {isErasure ? 'erasure-vs-retention decision' : `${dsar.type.toLowerCase()} fulfilment`}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-2xs text-ok"><Lock className="size-3" /> tamper-evident · retained per policy</div>
            </div>
            <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
              Every DSAR decision writes an audit record — provable handling for the DPDP Board and internal audit.
            </p>
          </div>

          {/* DPDP context */}
          <div className="card-surface p-3.5 text-2xs leading-relaxed text-muted-foreground">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Why erasure is overridden</h3>
            Under the DPDP Act, the right to erasure yields where another law requires retention. As a PFRDA pension
            fund manager, SPF must keep pension records (10 years), KYC (PMLA), accounting (Companies Act) and security
            logs (CERT-In 180-day in-India). Only data with no statutory basis — CRM marketing — is erased.
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={() => openDrawer({ kind: 'export-pdf', title: `DSAR response — ${dsar.id}`, payload: { filename: `${dsar.id}-response.pdf` } })}>
            <Download className="size-4" /> Export DSAR response
          </Button>
          <div className="text-center text-2xs text-muted-foreground" title={fmtIST(dsar.raisedAt)}>
            Raised {fmtIST(dsar.raisedAt)}
          </div>
        </div>
      </div>
    </div>
  )
}

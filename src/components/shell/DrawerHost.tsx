import { Download, FileCheck2, Send, ShieldAlert } from 'lucide-react'
import { useApp } from '@/store'
import { Drawer } from '../Drawer'
import { Button } from '../ui/Button'
import { MARQUEE } from '@/data'
import { fmtIST } from '@/lib/time'
import { maskPran } from '@/lib/format'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[170px_1fr] gap-2 border-b border-border py-1.5 last:border-0">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  )
}

export function DrawerHost() {
  const drawer = useApp((s) => s.drawer)
  const close = useApp((s) => s.closeDrawer)
  const pushToast = useApp((s) => s.pushToast)

  const inc = MARQUEE

  const certInBody = (
    <div className="space-y-4">
      <div className="rounded-md border border-info/30 bg-info-soft/50 p-3 text-xs text-foreground">
        Draft auto-populated from the single incident record. Review and sign off to submit to
        CERT-In.
      </div>
      <div>
        <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          CERT-In Incident Report — Annexure I (Direction 20(3)/2022)
        </div>
        <div className="rounded-lg border border-border p-3">
          <Field label="Reporting entity" value="Sankalp Pension Funds Pvt. Ltd. (PFRDA NPS PFM)" />
          <Field label="Incident reference" value={inc.id} />
          <Field label="Type of incident" value="Ransomware / malicious code (file-encryption)" />
          <Field label="Date & time of detection" value={`${fmtIST(inc.detectedAt)} (NTP-synced)`} />
          <Field label="Affected systems" value={inc.assets.join(', ')} />
          <Field label="Detection source" value={inc.source} />
          <Field label="Subscriber impact" value={inc.subscriberImpacting ? 'Yes — fund-accounting impacted' : 'No'} />
          <Field label="Personal data involved" value={inc.personalDataInvolved ? 'Yes — PRAN / KYC in scope' : 'No'} />
          <Field label="Sample affected PRAN" value={maskPran('110078451293')} />
          <Field label="Containment status" value="Contained — 2 hosts isolated, 4 accounts disabled, C2 blocked" />
          <Field label="Logs available" value="Yes — 180-day in-India retention (Splunk SIEM, EDR)" />
          <Field label="Prepared by" value="Rajesh Iyer (CISO) · pending sign-off" />
        </div>
      </div>
    </div>
  )

  const pfrdaBody = (
    <div className="space-y-4">
      <div className="rounded-md border border-info/30 bg-info-soft/50 p-3 text-xs">
        PFRDA ICS incident intimation (48-hour window) + quarterly Annexure — drafted from the same
        record.
      </div>
      <div className="rounded-lg border border-border p-3">
        <Field label="Regulated entity" value="Sankalp Pension Funds Pvt. Ltd." />
        <Field label="PFRDA registration" value="Category I — NPS Pension Fund Manager" />
        <Field label="Incident reference" value={inc.id} />
        <Field label="ICS classification" value="Critical (PFRDA ICS 2024 / circular PFRDA/2025/05/ICS/01)" />
        <Field label="Subscriber-impacting" value="Yes — NPS Scheme E/C/G fund accounting" />
        <Field label="Intimation window" value="48 hours from detection" />
        <Field label="Quarterly Annexure" value="Auto-linked to OBL-PFRDA quarterly return" />
      </div>
    </div>
  )

  const dpdpBody = (
    <div className="space-y-4">
      <div className="rounded-md border border-info/30 bg-info-soft/50 p-3 text-xs">
        DPDP personal-data-breach track (~72-hour intimation to the Data Protection Board and
        affected data principals).
      </div>
      <div className="rounded-lg border border-border p-3">
        <Field label="Data fiduciary" value="Sankalp Pension Funds Pvt. Ltd." />
        <Field label="Breach reference" value={inc.id} />
        <Field label="Personal data categories" value="PRAN, KYC, nominee, bank details" />
        <Field label="Est. principals affected" value="Under assessment — CRA segment" />
        <Field label="Intimation window" value="~72 hours (DPDP Rules 2025)" />
        <Field label="Consent / spoke" value="OneTrust DPDP spoke — affected-principal list pending" />
      </div>
    </div>
  )

  const exportBody = (
    <div className="space-y-3">
      <div className="rounded-md border border-ok/30 bg-ok-soft/50 p-3 text-xs">
        Export prepared — the document below is ready to download as a PDF.
      </div>
      <div className="rounded-lg border border-border p-4 text-center">
        <FileCheck2 className="mx-auto size-8 text-ok" />
        <div className="mt-2 text-sm font-medium text-foreground">
          {(drawer.payload as { filename?: string })?.filename ?? 'GRC-One-export.pdf'}
        </div>
        <div className="mt-0.5 text-2xs text-muted-foreground">Generated {fmtIST(new Date().toISOString())}</div>
      </div>
    </div>
  )

  const map: Record<string, { title: string; subtitle: string; body: React.ReactNode; cta: string; icon: React.ReactNode }> = {
    'cert-in-report': { title: 'CERT-In Incident Report', subtitle: `${inc.id} · Annexure I draft`, body: certInBody, cta: 'Sign off & submit', icon: <ShieldAlert className="size-4" /> },
    'pfrda-notify': { title: 'Notify PFRDA', subtitle: `${inc.id} · ICS intimation`, body: pfrdaBody, cta: 'Send intimation', icon: <Send className="size-4" /> },
    'dpdp-track': { title: 'DPDP Breach Track', subtitle: `${inc.id} · Data Protection Board`, body: dpdpBody, cta: 'Open DPDP track', icon: <ShieldAlert className="size-4" /> },
    'export-pdf': { title: drawer.title ?? 'Export', subtitle: 'Document ready', body: exportBody, cta: 'Download', icon: <Download className="size-4" /> },
    generic: { title: drawer.title ?? 'Details', subtitle: '', body: <div className="text-sm text-muted-foreground">Action recorded.</div>, cta: 'Done', icon: null },
  }

  const cfg = drawer.kind ? map[drawer.kind] ?? map.generic : map.generic

  return (
    <Drawer
      open={drawer.open}
      onClose={close}
      title={cfg.title}
      subtitle={cfg.subtitle}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={close}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => {
              pushToast({ title: cfg.cta, description: 'Action completed.', variant: 'success' })
              close()
            }}
          >
            {cfg.icon}
            {cfg.cta}
          </Button>
        </div>
      }
    >
      {cfg.body}
    </Drawer>
  )
}

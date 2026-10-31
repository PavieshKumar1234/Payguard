import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Card from '../components/ui/Card'
import { getAudit } from '../lib/api'

export default function Audit() {
  const [events, setEvents] = useState<any[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const LABELS: Record<string, string> = {
    purchase_request_received: 'Payment request received',
    policy_evaluated: 'Policy evaluated',
    risk_analysis_completed: 'AI risk analysis completed',
    human_approval_requested: 'Human approval requested',
    human_approval: 'Human approval recorded',
    paypal_order_created: 'PayPal order created',
    paypal_payment_captured: 'PayPal payment captured',
    payment_blocked: 'Payment blocked — no PayPal order',
    paypal_not_configured: 'PayPal not configured',
    paypal_order_failed: 'PayPal order failed',
    policy_parsed: 'Policy parsed',
    policy_activated: 'Policy activated',
  }

  useEffect(() => {
    getAudit().then((d) => setEvents([...(d.audit_logs ?? [])].reverse())).catch((e) => setErr(e.message))
  }, [])

  return (
    <div className="max-w-3xl flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl font-bold">Audit Log</h2>
        <p className="text-on-light-muted text-sm mt-1">Every decision is explainable and recorded. Trust infrastructure, not a black box.</p>
      </div>
      <Card>
        {err && <p className="text-red-300 text-sm">{err}</p>}
        {events.length === 0 && !err ? (
          <p className="text-on-dark-subtle text-sm py-8 text-center">No audit events yet</p>
        ) : (
          <ol className="relative border-l border-electric/25 ml-2 flex flex-col gap-4">
            {events.map((e, i) => (
              <li key={i} className="ml-5">
                <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-cyanx shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
                <button className="flex items-center gap-2 text-left w-full" onClick={() => setOpen(open === i ? null : i)}>
                  {open === i ? <ChevronDown size={14} className="text-cyanx" /> : <ChevronRight size={14} className="text-on-dark-subtle" />}
                  <span className="font-medium text-on-dark">{LABELS[e.event_type] ?? e.event_type.replace(/_/g, ' ')}</span>
                  <span className="text-on-dark-subtle text-xs font-mono">{e.event_type}</span>
                </button>
                {open === i && <p className="text-on-dark-muted text-sm mt-1 ml-5 font-mono break-all">{JSON.stringify(e.payload)}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}

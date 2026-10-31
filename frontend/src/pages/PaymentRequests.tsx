import { useEffect, useState } from 'react'
import { CreditCard, Loader2, Plus } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CreateRequestModal from '../components/purchase/CreateRequestModal'
import { approvePurchase, getPayments, getPurchaseRequests } from '../lib/api'

type Req = { id: string; merchant: string; item_summary?: string; description?: string; amount: number; currency: string; decision: string; reason?: string; risk?: any }

const filters = ['All', 'Approved', 'Review', 'Blocked'] as const
const tone: Record<string, string> = { APPROVED: 'approved', REVIEW_REQUIRED: 'review', BLOCKED: 'blocked' }
const match: Record<(typeof filters)[number], string | null> = {
  All: null, Approved: 'APPROVED', Review: 'REVIEW_REQUIRED', Blocked: 'BLOCKED',
}
const tabFor: Record<string, (typeof filters)[number]> = {
  APPROVED: 'Approved', REVIEW_REQUIRED: 'Review', BLOCKED: 'Blocked',
}

export default function PaymentRequests() {
  const [f, setF] = useState<(typeof filters)[number]>('All')
  const [reqs, setReqs] = useState<Req[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<Req | null>(null)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const load = () => {
    getPurchaseRequests().then((d) => setReqs(d.requests ?? [])).catch((e) => setErr(e.message))
    getPayments().then((d) => setPayments(d.payments ?? [])).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const paypalFor = (id: string) => payments.find((p) => p.request_id === id)

  // After a submission the list is re-read from the backend and the filter jumps
  // to the tab that matches the real decision, so the new request is always
  // visible under the outcome the engine actually returned.
  const handleCreated = (record: Req) => {
    setCreating(false)
    setErr(null)
    setNotice(`Request ${record?.id ?? ''} created — ${String(record?.decision ?? '').replace('_', ' ')}. ${record?.reason ?? ''}`.trim())
    setF(tabFor[record?.decision] ?? 'All')
    load()
  }

  // An auto-approved request still needs a PayPal order before it can be paid.
  // This reuses the existing approval endpoint — the single place that creates
  // an order after an APPROVED decision — and then hands the buyer to PayPal.
  const startCheckout = async () => {
    if (!selected || payBusy) return
    setPayBusy(true)
    setPayError(null)
    try {
      const res = await approvePurchase(selected.id)
      const url = res?.paypal?.approve_url
      if (url) {
        window.location.assign(url)
        return
      }
      setPayError(
        res?.paypal?.status === 'NOT_CONFIGURED'
          ? 'PayPal Sandbox credentials are not configured on the backend.'
          : res?.paypal?.detail ?? 'The backend did not return a PayPal approval URL.',
      )
      load()
    } catch (e: any) {
      setPayError(e?.message ?? 'Could not create the PayPal order.')
    } finally {
      setPayBusy(false)
    }
  }

  const shown = reqs.filter((r) => !match[f] || r.decision === match[f])

  return (
    <div className="flex flex-col gap-5">
      {/* Filters sit on the light page canvas, so they use light-surface tokens:
          dark ink on a white pill. Active = electric tint + deep accent ink. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((x) => (
            <button
              key={x}
              onClick={() => setF(x)}
              aria-pressed={f === x}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F7FA] disabled:cursor-not-allowed disabled:opacity-100 ${
                f === x
                  ? 'bg-electric/15 text-accent-ink border-electric/50 shadow-[0_0_14px_rgba(59,130,246,0.25)]'
                  : 'bg-white/70 text-ink-muted border-slate-200 hover:bg-white hover:text-ink hover:border-electric/40'
              }`}
            >
              {x}
            </button>
          ))}
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="inline mr-2" size={16} />
          Create Purchase Request
        </Button>
      </div>

      {notice && (
        <Card className="border-emeraldx/40">
          <p className="text-emerald-300 text-sm">{notice}</p>
        </Card>
      )}
      {err && <Card><p className="text-red-300 text-sm">{err}</p></Card>}
      {shown.length === 0 && !err && (
        <Card><p className="text-on-dark-subtle text-sm py-8 text-center">No payment requests yet</p></Card>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map((r) => (
          <Card key={r.id} hover>
            <div onClick={() => { setSelected(r); setPayError(null) }} className="cursor-pointer">
            <div className="flex items-start justify-between">
              <h3 className="font-display font-bold">{r.item_summary || r.merchant}</h3>
              <Badge label={r.decision.replace('_', ' ')} tone={tone[r.decision]} />
            </div>
            <p className="text-on-dark-muted text-sm mt-1">{r.merchant}</p>
            <p className={`font-display text-2xl font-bold mt-3 bg-clip-text text-transparent bg-gradient-to-r ${r.decision === 'APPROVED' ? 'from-emerald-400 to-cyanx' : r.decision === 'REVIEW_REQUIRED' ? 'from-amber-400 to-fuchsia-300' : 'from-red-400 to-fuchsia-300'}`}>
              {r.currency ?? 'USD'} {r.amount}
            </p>
            {r.reason && <p className="text-on-dark-subtle text-xs mt-2">{r.reason}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {r.risk?.risk_level && <Badge label={`AI ${r.risk.risk_level}`} tone={r.risk.risk_level === 'HIGH' ? 'blocked' : r.risk.risk_level === 'MEDIUM' ? 'review' : 'approved'} />}
              {r.decision === 'REVIEW_REQUIRED' && <Badge label="APPROVAL PENDING" tone="review" />}
              {paypalFor(r.id) && <Badge label={`PAYPAL ${paypalFor(r.id).status}`} tone="cyan" />}
              {r.decision === 'BLOCKED' && <Badge label="PAYPAL NOT CALLED" tone="blocked" />}
            </div>
            </div>
          </Card>
        ))}
      </div>

      {creating && <CreateRequestModal onClose={() => setCreating(false)} onCreated={handleCreated} />}

      <Modal open={!!selected} title="Decision Detail" onClose={() => setSelected(null)}>
        {selected && (() => {
          const pay = paypalFor(selected.id)
          return (
            <div className="flex flex-col gap-3 text-sm">
              <p className="font-semibold text-base text-on-dark">{selected.item_summary || selected.merchant} · {selected.currency ?? 'USD'} {selected.amount}</p>
              <p className="text-on-dark-muted">Merchant: {selected.merchant}</p>
              {selected.description && <p className="text-on-dark-muted">Note: {selected.description}</p>}
              <div>
                <p className="font-display text-lg font-bold">
                  {selected.decision === 'BLOCKED' && <span className="text-red-300">BLOCKED</span>}
                  {selected.decision === 'REVIEW_REQUIRED' && <span className="text-amber-300">HUMAN APPROVAL REQUIRED</span>}
                  {selected.decision === 'APPROVED' && <span className="text-emerald-300">APPROVED</span>}
                </p>
                {selected.reason && <p className="text-on-dark-muted mt-1">Why: {selected.reason}</p>}
              </div>
              {selected.risk && (
                <div>
                  <p className="text-on-dark-subtle text-xs tracking-widest">AI RISK</p>
                  <Badge label={selected.risk.risk_level} tone={selected.risk.risk_level === 'HIGH' ? 'blocked' : selected.risk.risk_level === 'MEDIUM' ? 'review' : 'approved'} />
                  {selected.risk.signals && <div className="flex flex-wrap gap-1 mt-2">{selected.risk.signals.map((s: string) => <Badge key={s} label={s} tone="violet" />)}</div>}
                </div>
              )}
              <div className="rounded-xl bg-navy-2/70 border border-electric/15 p-3 flex flex-col gap-2">
                <p className="text-on-dark-subtle text-xs tracking-widest">PAYPAL</p>
                {selected.decision === 'BLOCKED' ? (
                  <p className="text-red-300 font-semibold">NOT CALLED · NO ORDER CREATED</p>
                ) : pay ? (
                  <p className="text-on-dark-muted">Order {pay.paypal_order_id ?? '—'} · Status {pay.status}</p>
                ) : (
                  <p className="text-on-dark-muted">No PayPal order yet</p>
                )}
                {payError && <p role="alert" className="text-red-300 text-xs">{payError}</p>}
                {selected.decision === 'APPROVED' && !pay && (
                  <Button disabled={payBusy} onClick={startCheckout} className="self-start">
                    {payBusy ? (
                      <>
                        <Loader2 className="inline mr-2 animate-spin" size={16} />
                        Creating order…
                      </>
                    ) : (
                      <>
                        <CreditCard className="inline mr-2" size={16} />
                        Continue to PayPal Checkout
                      </>
                    )}
                  </Button>
                )}
                {selected.decision === 'APPROVED' && pay?.approve_url && !['COMPLETED', 'CANCELLED', 'BLOCKED'].includes(pay.status) && (
                  <a
                    href={pay.approve_url}
                    className="self-start inline-flex items-center gap-2 rounded-xl border border-cyanx/40 px-3 py-2 text-sm font-semibold text-cyanx hover:bg-cyanx/10 transition-colors"
                  >
                    <CreditCard size={16} />
                    Continue with PayPal
                  </a>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

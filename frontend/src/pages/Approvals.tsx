import { useEffect, useState } from 'react'
import { CheckCircle2, ShieldAlert, XCircle, AlertTriangle, CreditCard } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { approvePurchase, blockPurchase, getPurchaseRequests } from '../lib/api'

export default function Approvals() {
  const [pending, setPending] = useState<any[]>([])
  const [result, setResult] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<'approve' | 'block' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = () => getPurchaseRequests('REVIEW_REQUIRED').then((d) => setPending(d.requests ?? [])).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])

  // Lock the action on the first click so rapid clicks cannot submit twice.
  // The backend is the real guard (one order per request); this stops the
  // duplicate request from ever being sent. The displayed result is always the
  // real backend response - never simulated.
  const act = async (id: string, kind: 'approve' | 'block', fn: (id: string) => Promise<any>) => {
    if (busy) return
    setBusy(kind)
    setNotice(null)
    try {
      const res = await fn(id)
      setResult(res)
      await load()
      if (res?.paypal?.idempotent_replay) {
        setNotice('Existing PayPal order reused - no second order was created.')
      }
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(null)
    }
  }

  const current = pending[0]

  return (
    <div className="max-w-3xl flex flex-col gap-5">
      <h2 className="font-display text-2xl font-bold">Your approval is the final gate.</h2>

      {err && <Card><p className="text-red-300 text-sm">{err}</p></Card>}
      {notice && <Card><p className="text-amber-300 text-sm">{notice}</p></Card>}

      {result ? (
        <Card className={result?.paypal?.status === 'NO_ORDER_CREATED' || result?.decision === 'BLOCKED'
          ? 'border-redx/50'
          : 'border-emeraldx/50'}>
          <div className="flex flex-col items-center text-center py-6 gap-3">
            {result?.decision === 'BLOCKED' || result?.paypal?.status === 'NO_ORDER_CREATED' ? (
              <>
                <XCircle size={44} className="text-red-400" />
                <h3 className="font-display text-xl font-bold text-red-300">PAYMENT BLOCKED</h3>
                <p className="text-on-dark-muted text-sm">NO ORDER CREATED</p>
              </>
            ) : (
              <>
                <CheckCircle2 size={44} className="text-emeraldx" />
                <h3 className="font-display text-xl font-bold text-emeraldx">HUMAN AUTHORIZATION RECEIVED</h3>
                <p className="text-cyanx text-xs font-semibold tracking-widest">HUMAN APPROVAL → PAYPAL ORDER CREATED</p>
                <p className="text-on-dark-muted text-sm max-w-md">
                  {result?.paypal?.status === 'NOT_CONFIGURED'
                    ? 'PayPal Sandbox credentials are not configured. No order was created.'
                    : result?.paypal?.id
                      ? `PayPal order ${result.paypal.idempotent_replay ? 'already exists (reused, no duplicate created)' : 'created'}: ${result.paypal.id}`
                      : result?.paypal?.detail ?? 'Awaiting PayPal response.'}
                </p>
                {result?.paypal?.approve_url && (
                  <a
                    href={result.paypal.approve_url}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyanx to-electric text-navy font-semibold text-sm shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-shadow duration-200"
                  >
                    <CreditCard size={16} />
                    CONTINUE WITH PAYPAL
                  </a>
                )}
              </>
            )}
            <Button variant="ghost" onClick={() => { setResult(null); load() }}>Back to queue</Button>
          </div>
        </Card>
      ) : current ? (
        <Card className="border-amberx/40 shadow-[0_0_28px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-2 text-amber-300 font-semibold tracking-widest text-xs mb-4">
            <ShieldAlert size={16} /> PAYMENT REQUIRES YOUR APPROVAL
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-display text-xl font-bold text-on-dark">{current.item_summary || current.merchant}</h3>
              <p className="text-on-dark-muted">{current.merchant}</p>
            </div>
            <p className="font-display text-3xl font-bold bg-gradient-to-r from-amber-400 to-fuchsia-300 bg-clip-text text-transparent">{current.currency ?? 'USD'} {current.amount}</p>
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-navy-2/70 border border-electric/15 p-3">
              <p className="text-on-dark-subtle text-xs">POLICY</p><p className="text-on-dark-muted">{current.reason}</p>
            </div>
            <div className="rounded-xl bg-navy-2/70 border border-electric/15 p-3">
              <p className="text-on-dark-subtle text-xs">MERCHANT</p><p className="text-on-dark-muted">{current.merchant}</p>
            </div>
            <div className="rounded-xl bg-navy-2/70 border border-redx/30 p-3">
              <p className="text-on-dark-subtle text-xs">RISK</p>
              <Badge label={current.risk?.risk_level ?? 'N/A'} tone={current.risk?.risk_level === 'HIGH' ? 'blocked' : current.risk?.risk_level === 'MEDIUM' ? 'review' : 'approved'} />
            </div>
          </div>
          {current.risk?.signals && (
            <div className="mt-4">
              <p className="text-xs tracking-widest text-on-dark-subtle font-semibold mb-2">SIGNALS</p>
              <div className="flex flex-wrap gap-2">{current.risk.signals.map((s: string) => <Badge key={s} label={s} tone="violet" />)}</div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button variant="danger" disabled={busy !== null} onClick={() => act(current.id, 'block', blockPurchase)}>
              <XCircle className="inline mr-2" size={16} />
              {busy === 'block' ? 'BLOCKING\u2026' : busy ? 'WAITING\u2026' : 'BLOCK PAYMENT'}
            </Button>
            <Button variant="emerald" disabled={busy !== null} onClick={() => act(current.id, 'approve', approvePurchase)}>
              <CheckCircle2 className="inline mr-2" size={16} />
              {busy === 'approve' ? 'APPROVING\u2026' : busy ? 'WAITING\u2026' : 'APPROVE PAYMENT'}
            </Button>
          </div>
        </Card>
      ) : (
        !err && <Card><p className="text-on-dark-subtle text-sm py-8 text-center">No payments awaiting approval</p></Card>
      )}

      <div className="flex items-center gap-2 text-on-light-faint text-xs">
        <AlertTriangle size={13} className="text-amber-600" />
        PayPal statuses are only shown when returned by the real backend — never simulated.
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react'
import Card from '../components/ui/Card'
import { cancelPayment, returnPayment } from '../lib/api'

type Mode = 'return' | 'cancel'

/**
 * Handles the URLs PayPal redirects the buyer back to
 * (backend config: PAYPAL_RETURN_URL / PAYPAL_CANCEL_URL).
 *
 * The browser only supplies the order token. The backend re-checks ownership,
 * the APPROVED decision and PayPal's own payer-approval state, and captures at
 * most once. This page never invents a status: it renders exactly what the
 * backend returns, and only says "complete" when the backend confirms COMPLETED.
 */
export default function PaymentResult({ mode }: { mode: Mode }) {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const missingToken = !token
  const [loading, setLoading] = useState(!missingToken)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  // StrictMode double-invokes effects in dev. The backend is idempotent, but a
  // ref guard keeps it to a single request per mount.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!token) return
    const call = mode === 'return' ? returnPayment(token) : cancelPayment(token)
    call
      .then((r) => setResult(r))
      .catch((e) => setError(e?.message ?? 'The payment result could not be confirmed.'))
      .finally(() => setLoading(false))
  }, [mode, token])

  const errorMessage = error ?? (missingToken
    ? 'Missing PayPal order token in the URL. This page is only reached by redirect from PayPal.'
    : null)

  const status: string | undefined = result?.status
  const completed = status === 'COMPLETED'
  const cancelled = status === 'CANCELLED'

  const heading = loading
    ? mode === 'return' ? 'Confirming payment with PayPal…' : 'Processing cancellation…'
    : errorMessage
      ? 'Payment could not be confirmed'
      : completed
        ? 'Payment complete'
        : cancelled
          ? 'Payment cancelled'
          : status === 'NOT_APPROVED'
            ? 'Payment not approved'
            : status === 'NOT_CONFIGURED'
              ? 'PayPal is not configured'
              : status === 'ERROR'
                ? 'PayPal returned an error'
                : 'Checkout result'

  const accent = completed ? 'text-emeraldx' : cancelled ? 'text-on-dark-muted' : 'text-amber-300'

  return (
    <div className="max-w-2xl mx-auto">
      <Card className={completed ? 'border-emeraldx/50' : cancelled ? '' : 'border-amberx/40'}>
        <div className="flex flex-col items-center text-center py-6 gap-3">
          {loading ? (
            <Loader2 size={44} className="text-cyanx animate-spin" />
          ) : completed ? (
            <CheckCircle2 size={44} className="text-emeraldx" />
          ) : errorMessage || status === 'ERROR' ? (
            <XCircle size={44} className="text-red-400" />
          ) : status === 'NOT_CONFIGURED' ? (
            <ShieldAlert size={44} className="text-amber-300" />
          ) : (
            <AlertTriangle size={44} className="text-amber-300" />
          )}

          <h2 className={`font-display text-2xl font-bold ${loading ? 'text-on-dark' : accent}`}>{heading}</h2>

          {loading && <p className="text-on-dark-muted text-sm">Do not close this tab.</p>}

          {!loading && errorMessage && <p className="text-on-dark-muted text-sm max-w-md">{errorMessage}</p>}

          {!loading && !errorMessage && (
            <>
              {completed ? (
                <p className="text-cyanx text-xs font-semibold tracking-widest">
                  CONFIRMED BY PAYPAL · SERVER-SIDE CAPTURE
                </p>
              ) : status === 'NOT_APPROVED' ? (
                <p className="text-amber-300 text-xs font-semibold tracking-widest">NO CAPTURE ATTEMPTED</p>
              ) : null}

              {result?.amount != null && (
                <p className="font-display text-3xl font-bold bg-gradient-to-r from-cyanx to-electric bg-clip-text text-transparent">
                  {result.currency ?? 'USD'} {result.amount}
                </p>
              )}

              <p className="text-on-dark-muted text-sm max-w-md">{result?.detail}</p>

              <div className="w-full max-w-md text-left text-xs text-on-dark-subtle flex flex-col gap-1 mt-2">
                {result?.paypal_order_id && <p>PayPal order: <span className="font-mono text-on-dark-muted">{result.paypal_order_id}</span></p>}
                {result?.capture_id && <p>Capture ID: <span className="font-mono text-on-dark-muted">{result.capture_id}</span></p>}
                {result?.request_id && <p>PayGuard request: <span className="font-mono text-on-dark-muted">{result.request_id}</span></p>}
                {status && <p>Status: <span className="font-mono text-on-dark-muted">{status}</span></p>}
              </div>

              {!completed && status === 'NOT_APPROVED' && (
                <p className="text-on-dark-muted text-xs max-w-md">
                  You can retry the checkout from the Payments page — a new order is not created, the
                  existing one is reused.
                </p>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/payments" className="rounded-xl border border-cyanx/40 px-4 py-2 text-sm font-semibold text-cyanx hover:bg-cyanx/10 transition-colors">
              Payment History
            </Link>
            <Link to="/payment-requests" className="rounded-xl border border-electric/40 px-4 py-2 text-sm font-semibold text-on-dark-muted hover:text-on-dark hover:bg-electric/10 transition-colors">
              Payment Requests
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

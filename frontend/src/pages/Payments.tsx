import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import { getPayments } from '../lib/api'

const tone: Record<string, string> = { COMPLETED: 'approved', CREATED: 'cyan', APPROVED: 'cyan', PAYER_ACTION_REQUIRED: 'cyan', PAYPAL_NOT_CONFIGURED: 'review', BLOCKED: 'blocked', ERROR: 'blocked' }

// An order can still be paid while it is not in a terminal state and PayPal
// gave us an approval URL. Covers both CREATED and PAYER_ACTION_REQUIRED.
const canResumePaypal = (r: any) =>
  !!r.approve_url && !['COMPLETED', 'CANCELLED', 'BLOCKED'].includes(r.status)

export default function Payments() {
  const [rows, setRows] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    getPayments().then((d) => setRows(d.payments ?? [])).catch((e) => setErr(e.message))
  }, [])

  return (
    <Card>
      <h2 className="font-display text-xl font-bold mb-1">Payment History</h2>
      <p className="text-on-dark-muted text-sm mb-4">PayPal order IDs are shown only when returned by the PayPal API. Blocked requests never create an order.</p>
      {err && <p className="text-red-300 text-sm">{err}</p>}
      {rows.length === 0 && !err ? (
        <p className="text-on-dark-subtle text-sm py-8 text-center">No completed payments</p>
      ) : (
        <Table headers={['Merchant', 'Amount', 'Status', 'PayPal Order', 'Date', 'Action']}>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-electric/5 transition-colors">
              <td className="py-3 pr-4 text-on-dark-muted">{r.merchant}</td>
              <td className="py-3 pr-4 font-semibold text-on-dark">{r.currency ?? 'USD'} {r.amount}</td>
              <td className="py-3 pr-4"><Badge label={r.status} tone={tone[r.status] ?? 'info'} /></td>
              <td className={`py-3 pr-4 font-mono text-xs ${r.status === 'BLOCKED' ? 'text-red-300 font-semibold' : 'text-on-dark-muted'}`}>
                {r.status === 'BLOCKED' ? 'NO ORDER CREATED' : r.paypal_order_id ?? '—'}
              </td>
              <td className="py-3 pr-4 text-on-dark-muted">{(r.created_at ?? '').slice(0, 10)}</td>
              <td className="py-3">
                {/* A non-terminal order still needs the payer to approve at PayPal.
                    The link is PayPal's own HATEOAS approve URL, stored server-side. */}
                {canResumePaypal(r) ? (
                  <a
                    href={r.approve_url}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyanx/40 px-3 py-1.5 text-xs font-semibold text-cyanx hover:bg-cyanx/10 transition-colors"
                  >
                    <CreditCard size={14} />
                    Continue with PayPal
                  </a>
                ) : (
                  <span className="text-on-dark-subtle">—</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  )
}

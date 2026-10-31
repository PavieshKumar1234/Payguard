import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Loader2, Plus } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { createPurchaseRequest } from '../../lib/api'

// Common PayPal-supported settlement currencies. USD is the default; the
// backend rejects anything PayPal does not accept with a readable message.
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'HKD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'MXN', 'BRL', 'PHP', 'THB']

const inputClass =
  'w-full rounded-xl bg-navy-2/80 border border-electric/20 focus:border-cyanx/60 outline-none p-3 text-sm text-on-dark placeholder:text-on-dark-subtle transition-colors duration-200'

type FieldErrors = { item_summary?: string; merchant?: string; amount?: string }

function makeRequestId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function Field({
  label, htmlFor, required, error, hint, children,
}: {
  label: string; htmlFor: string; required?: boolean
  error?: string; hint?: string; children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-on-dark-subtle">
        {label}
        {required && <span className="text-red-300"> *</span>}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-xs text-red-300">{error}</span>
      ) : hint ? (
        <span className="text-xs text-on-dark-subtle">{hint}</span>
      ) : null}
    </div>
  )
}

export default function CreateRequestModal({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: (record: any) => void
}) {
  const [item, setItem] = useState('')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // One idempotency key per mounted form. A retry after a transient failure
  // reuses it, so the backend records the request at most once. The parent
  // mounts a fresh form each time it opens, so the key resets per submission.
  const [requestId] = useState(makeRequestId)

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (!item.trim()) next.item_summary = 'Item or product name is required.'
    if (!merchant.trim()) next.merchant = 'Merchant name is required.'
    const value = Number(amount)
    if (!amount.trim()) next.amount = 'Amount is required.'
    else if (!Number.isFinite(value)) next.amount = 'Enter a valid number.'
    else if (value <= 0) next.amount = 'Amount must be greater than 0.'
    return next
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const found = validate()
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const record = await createPurchaseRequest({
        item_summary: item.trim(),
        merchant: merchant.trim(),
        amount: Number(amount),
        currency,
        description: description.trim() || null,
        client_request_id: requestId,
      })
      onCreated(record)
    } catch (err: any) {
      setFormError(err?.message ?? 'The request could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open title="Create Purchase Request" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {formError && (
          <p role="alert" className="rounded-xl border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-300">
            {formError}
          </p>
        )}

        <Field label="Item / product name" htmlFor="pr-item" required error={errors.item_summary}>
          <input
            id="pr-item"
            autoFocus
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="e.g. Wireless keyboard"
            aria-invalid={!!errors.item_summary}
            className={inputClass}
          />
        </Field>

        <Field label="Merchant name" htmlFor="pr-merchant" required error={errors.merchant}>
          <input
            id="pr-merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g. Acme Store"
            aria-invalid={!!errors.merchant}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Amount" htmlFor="pr-amount" required error={errors.amount}>
              <input
                id="pr-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                aria-invalid={!!errors.amount}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Currency" htmlFor="pr-currency">
            <select
              id="pr-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description" htmlFor="pr-desc" hint="Optional — context for the reviewer">
          <textarea
            id="pr-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note about this purchase"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="inline mr-2 animate-spin" size={16} />
                Submitting…
              </>
            ) : (
              <>
                <Plus className="inline mr-2" size={16} />
                Submit Request
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

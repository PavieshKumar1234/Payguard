const BASE = '/api'

// Turn any non-2xx response into a message a person can act on. FastAPI puts a
// readable string in `detail`, or an array of field errors — both are surfaced
// instead of the old opaque "failed: 422".
async function readableError(res: Response, path: string): Promise<string> {
  try {
    const body = await res.json()
    const detail = body?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (Array.isArray(detail) && detail.length) {
      const messages = detail.map((d: any) => {
        const field = Array.isArray(d?.loc) ? d.loc.filter((p: any) => p !== 'body').join('.') : ''
        const msg = d?.msg ?? 'invalid value'
        return field ? `${field}: ${msg}` : msg
      })
      return messages.join('; ')
    }
    if (typeof body?.error === 'string' && body.error) return body.error
  } catch {
    // Response was not JSON; fall through to the generic message.
  }
  return `${path} failed (HTTP ${res.status})`
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, init)
  } catch {
    throw new Error('Cannot reach the PayGuard backend. Make sure it is running on http://localhost:8000.')
  }
  if (!res.ok) throw new Error(await readableError(res, path))
  return res.json()
}

export const apiGet = <T>(path: string) => req<T>(path)
export const apiPost = <T>(path: string, body: unknown) =>
  req<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const getDashboard = () => apiGet<any>('/dashboard')
export const getPurchaseRequests = (decision?: string) =>
  apiGet<any>(`/purchase/requests${decision ? `?decision=${decision}` : ''}`)
export const createPurchaseRequest = (body: unknown) => apiPost<any>('/purchase/request', body)
export const approvePurchase = (id: string) => apiPost<any>(`/purchase/${id}/approve`, {})
export const blockPurchase = (id: string) => apiPost<any>(`/purchase/${id}/block`, {})
export const getPayments = () => apiGet<any>('/payments')
export const getAudit = () => apiGet<any>('/audit')
export const getRisk = () => apiGet<any>('/risk')
export const parsePolicy = (natural_language: string) => apiPost<any>('/policies/parse', { natural_language })
export const confirmPolicy = (rules: unknown, natural_language?: string) =>
  apiPost<any>('/policies/confirm', { rules, natural_language })
// PayPal redirects the buyer back to these URLs with `?token=<order_id>`.
// The browser only supplies the lookup key; the backend re-verifies ownership,
// the APPROVED decision and PayPal's own payer-approval state before capturing.
export const returnPayment = (orderId: string) => apiGet<any>(`/payments/${encodeURIComponent(orderId)}/return`)
export const cancelPayment = (orderId: string) => apiPost<any>(`/payments/${encodeURIComponent(orderId)}/cancel`, {})

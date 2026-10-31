import { useState } from 'react'
import { Sparkles, Check, Loader2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { confirmPolicy, parsePolicy } from '../lib/api'

const DEFAULT_TEXT =
  "My AI can automatically spend up to ₹500. Anything above ₹500 requires my approval. Never buy from merchants I haven't approved. My monthly subscription budget is ₹2,000."

export default function Policies() {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const generate = async () => {
    setGenerating(true); setResult(null); setConfirmed(false); setErr(null)
    try {
      const res = await parsePolicy(text)
      setResult(res.rules)
    } catch (e: any) { setErr(e.message) } finally { setGenerating(false) }
  }

  const confirm = async () => {
    try {
      await confirmPolicy(result, text)
      setConfirmed(true)
    } catch (e: any) { setErr(e.message) }
  }

  const generated = result ? [
    { label: 'AUTOMATIC PURCHASE LIMIT', value: result.autoPurchaseLimit != null ? `₹${result.autoPurchaseLimit}` : '—', tone: 'text-cyanx' },
    { label: 'REQUIRES APPROVAL ABOVE', value: result.requireApprovalAbove != null ? `₹${result.requireApprovalAbove}` : '—', tone: 'text-amberx' },
    { label: 'APPROVED MERCHANTS', value: (result.allowedMerchants ?? []).join(' · ') || 'None listed', tone: 'text-emeraldx' },
    { label: 'MONTHLY SUBSCRIPTION LIMIT', value: result.monthlySubscriptionLimit != null ? `₹${result.monthlySubscriptionLimit}` : '—', tone: 'text-violet-300' },
  ] : []

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <Card>
        <h2 className="font-display text-xl font-bold">Define how your AI can spend</h2>
        <p className="text-on-dark-muted text-sm mt-1 mb-4">
          Describe your rules in plain language. PayGuard converts them into structured, enforceable rules — you confirm before they activate.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
          className="w-full rounded-xl bg-navy-2/80 border border-electric/20 focus:border-cyanx/50 outline-none p-4 text-sm text-on-dark placeholder:text-on-dark-subtle transition-colors duration-200" />
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="inline animate-spin mr-2" size={16} /> : <Sparkles className="inline mr-2" size={16} />}
            Generate Policy
          </Button>
          {generating && <span className="text-cyanx text-sm animate-pulse">Analyzing your rules...</span>}
        </div>
        {result?.source && <p className="text-on-dark-subtle text-xs mt-3">Source: {result.source}</p>}
        {err && <p className="text-red-300 text-sm mt-3">{err}</p>}
      </Card>

      {result && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold">Generated Policy</h3>
            {confirmed ? <Badge label="ACTIVE" tone="approved" /> : <Badge label="AWAITING CONFIRMATION" tone="review" />}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {generated.map((r) => (
              <div key={r.label} className="rounded-xl border border-electric/15 bg-navy-2/60 p-4">
                <p className="text-[11px] tracking-widest text-on-dark-subtle font-semibold">{r.label}</p>
                <p className={`font-display text-xl font-bold mt-1 ${r.tone}`}>{r.value}</p>
              </div>
            ))}
          </div>
          {!confirmed ? (
            <>
              <p className="text-amber-300 text-sm mt-4">Review carefully — this policy is not active until you confirm it.</p>
              <Button variant="emerald" className="mt-3" onClick={confirm}>
                <Check className="inline mr-2" size={16} /> Confirm Policy
              </Button>
            </>
          ) : (
            <p className="text-emeraldx text-sm mt-4">Policy confirmed and active. The deterministic policy engine now enforces these rules.</p>
          )}
        </Card>
      )}
    </div>
  )
}

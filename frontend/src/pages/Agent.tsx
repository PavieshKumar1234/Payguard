import { useEffect, useState } from 'react'
import { ArrowDown, Bot, Wrench } from 'lucide-react'
import Card from '../components/ui/Card'

const steps = [
  'PURCHASE REQUEST RECEIVED',
  'UNDERSTAND REQUEST',
  'CHECK POLICY',
  'CHECK MERCHANT',
  'ANALYZE CONTEXTUAL RISK',
  'MAKE DECISION',
  'APPROVE / REVIEW / BLOCK',
  'PAYMENT',
]

const tools = [
  'get_user_policy()',
  'check_policy()',
  'get_spending_history()',
  'check_merchant()',
  'analyze_risk()',
  'request_human_approval()',
  'create_paypal_order()',
  'capture_paypal_order()',
  'write_audit_event()',
]

export default function Agent() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 1200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violetx to-magentax flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
            <Bot className="text-white" size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">PayGuard Agent</h2>
            <p className="text-on-dark-muted text-sm">Your independent authorization layer between AI and payments.</p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-display font-bold mb-4">Execution Trace</h3>
          <div className="flex flex-col items-start gap-0">
            {steps.map((s, i) => (
              <div key={s} className="w-full">
                <div
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-300 ${
                    i === active
                      ? 'border-cyanx/60 text-cyanx bg-cyanx/10 shadow-[0_0_18px_rgba(34,211,238,0.25)]'
                      : i < active
                        ? 'border-emeraldx/30 text-emerald-300 bg-emeraldx/5'
                        : 'border-electric/10 text-on-dark-subtle bg-navy-2/40'
                  }`}
                >
                  {s}
                </div>
                {i < steps.length - 1 && <ArrowDown size={14} className="text-cyanx/70 ml-5 my-0.5" />}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-display font-bold mb-4">Agent Tools</h3>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {tools.map((t, i) => (
              <div
                key={t}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 font-mono text-xs transition-all duration-300 ${
                  i === active % tools.length
                    ? 'border-violetx/60 text-violet-300 bg-violetx/10 shadow-[0_0_16px_rgba(139,92,246,0.25)]'
                    : 'border-electric/15 text-on-dark-muted bg-navy-2/50'
                }`}
              >
                <Wrench size={13} />
                {t}
              </div>
            ))}
          </div>
          <p className="text-on-dark-subtle text-xs mt-4">
            Tools execute sequentially per purchase request. The deterministic policy engine — not the model — makes the final call.
          </p>
        </Card>
      </div>
    </div>
  )
}

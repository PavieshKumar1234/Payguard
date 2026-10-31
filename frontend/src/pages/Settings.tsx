import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { User, SlidersHorizontal, Store, Brain, CreditCard, Lock, Shield } from 'lucide-react'

const sections = [
  { icon: User, title: 'Profile', body: 'Name, account owner, contact preferences.' },
  { icon: SlidersHorizontal, title: 'Spending Rules', body: 'Automatic purchase limit, review thresholds, monthly caps.' },
  { icon: Store, title: 'Approved Merchants', body: 'Manage the merchant allowlist enforced by the policy engine.' },
  { icon: Brain, title: 'AI Risk Preferences', body: 'Sensitivity of contextual risk signals. Advisory only — never overrides rules.' },
  { icon: CreditCard, title: 'Payment Settings', body: 'Default currency, PayPal Sandbox mode, capture behavior.' },
  { icon: Shield, title: 'PayPal Sandbox', body: 'Client ID shown masked. Redirect URLs and sandbox app configuration.' },
  { icon: Lock, title: 'Security', body: 'Session controls. The PayPal Client Secret is never displayed in the browser.' },
]

export default function Settings() {
  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div className="grid md:grid-cols-2 gap-4">
        {sections.map(({ icon: Icon, title, body }) => (
          <Card key={title} hover>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-electric/15 border border-electric/30 flex items-center justify-center">
                <Icon size={17} className="text-cyanx" />
              </div>
              <h3 className="font-display font-bold">{title}</h3>
            </div>
            <p className="text-on-dark-muted text-sm mt-3">{body}</p>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge label="CLIENT SECRET NEVER EXPOSED" tone="violet" surface="light" />
        <Badge label="SERVER-SIDE ONLY" tone="cyan" surface="light" />
      </div>
    </div>
  )
}

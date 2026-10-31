import { useEffect, useState } from 'react'
import { Bell, Menu, ShieldCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { apiGet } from '../../lib/api'

const titles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Overview', subtitle: 'Control your AI payment authority' },
  '/agent': { title: 'AI Agent', subtitle: 'Authorization layer between AI and payments' },
  '/policies': { title: 'Policies', subtitle: 'Natural-language spending rules, enforced in code' },
  '/payment-requests': { title: 'Payment Requests', subtitle: 'Every AI purchase request, decided and logged' },
  '/approvals': { title: 'Approvals', subtitle: 'Human control for sensitive transactions' },
  '/risk': { title: 'Risk Center', subtitle: 'Advisory AI risk signals — rules decide' },
  '/payments': { title: 'Payments', subtitle: 'Real PayPal Sandbox payment records' },
  '/audit': { title: 'Audit Log', subtitle: 'Every decision, explainable and recorded' },
  '/settings': { title: 'Settings', subtitle: 'Account and protection preferences' },
}

export default function Header({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const [sandboxReady, setSandboxReady] = useState<boolean | null>(null)

  useEffect(() => {
    apiGet<{ paypal_configured?: boolean }>('/health')
      .then((d) => setSandboxReady(!!d.paypal_configured))
      .catch(() => setSandboxReady(null))
  }, [])

  const meta = titles[pathname] ?? { title: 'PayGuard', subtitle: 'AI Payment Authorization Agent' }

  return (
    <header className="flex items-center justify-between gap-4 px-4 md:px-6 py-4 bg-white/70 backdrop-blur border-b border-slate-200/80 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button className="md:hidden glass-card p-2 rounded-xl" onClick={onMenu} aria-label="Open menu">
          <Menu size={18} className="text-cyanx" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-2xl font-bold text-on-light leading-tight">{meta.title}</h1>
          <p className="text-on-light-muted text-xs md:text-sm truncate">{meta.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold tracking-wider ${
            sandboxReady
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <ShieldCheck size={13} />
          {sandboxReady ? 'PAYPAL SANDBOX' : sandboxReady === null ? 'CHECKING…' : 'SANDBOX OFFLINE'}
        </div>
        <button className="glass-card p-2 rounded-xl text-on-dark-muted hover:text-cyanx transition-colors duration-200" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-electric to-magentax flex items-center justify-center font-bold text-sm text-white shadow-[0_0_14px_rgba(59,130,246,0.35)]">P</div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-on-light leading-tight">Paviesh</p>
            <p className="text-[11px] text-on-light-faint">Account owner</p>
          </div>
        </div>
      </div>
    </header>
  )
}
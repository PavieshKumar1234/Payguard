import { NavLink } from 'react-router-dom'
import {
  Bot, LayoutDashboard, ShieldCheck, FileText, ShoppingCart,
  CheckCheck, Gauge, CreditCard, ScrollText, Settings as SettingsIcon, X,
} from 'lucide-react'

const items = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, tone: 'text-electric' },
  { to: '/agent', label: 'AI Agent', icon: Bot, tone: 'text-violet-300' },
  { to: '/policies', label: 'Policies', icon: FileText, tone: 'text-cyanx' },
  { to: '/payment-requests', label: 'Payment Requests', icon: ShoppingCart, tone: 'text-magentax' },
  { to: '/approvals', label: 'Approvals', icon: CheckCheck, tone: 'text-amberx' },
  { to: '/risk', label: 'Risk Center', icon: Gauge, tone: 'text-red-400' },
  { to: '/payments', label: 'Payments', icon: CreditCard, tone: 'text-emeraldx' },
  { to: '/audit', label: 'Audit Log', icon: ScrollText, tone: 'text-cyanx' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, tone: 'text-on-dark-muted' },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-navy/70 backdrop-blur-sm z-30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed md:static z-40 inset-y-0 left-0 w-64 md:w-60 shrink-0 p-4 flex flex-col gap-1 transition-transform duration-300 border-r border-electric/15 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ background: 'linear-gradient(180deg, rgba(7,17,31,0.97) 0%, rgba(11,18,32,0.97) 100%)', backdropFilter: 'blur(14px)' }}
      >
        <div className="flex items-center justify-between px-2 pb-4 mb-2 border-b border-electric/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-cyanx drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" size={26} />
            <span className="font-display text-xl font-bold tracking-tight bg-gradient-to-r from-electric via-cyanx to-violetx bg-clip-text text-transparent">
              PAYGUARD
            </span>
          </div>
          <button className="md:hidden text-on-dark-muted" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {items.map(({ to, label, icon: Icon, tone }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-electric/15 text-white border border-electric/40 shadow-[0_0_20px_rgba(59,130,246,0.28)]'
                    : 'text-on-dark-subtle hover:bg-card/70 hover:text-on-dark hover:translate-x-0.5 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-gradient-to-b from-cyanx to-electric shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  )}
                  <Icon size={17} className={isActive ? 'text-cyanx' : tone} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-3 pt-3 border-t border-electric/15 flex flex-col gap-3">
          <div className="flex items-center gap-2 px-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emeraldx opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emeraldx" />
            </span>
            <div>
              <p className="text-[10px] tracking-[0.2em] text-emeraldx font-bold">PROTECTED</p>
              <p className="text-[10px] tracking-[0.2em] text-on-dark-subtle">PAYPAL SANDBOX</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-electric to-magentax flex items-center justify-center font-bold text-sm text-white">P</div>
            <div>
              <p className="text-sm font-semibold leading-tight text-mist">Paviesh</p>
              <p className="text-[11px] text-on-dark-subtle">Account owner</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
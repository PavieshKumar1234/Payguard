import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ShoppingCart, Ban, CheckCheck, ArrowRight,
  Bot, CreditCard, Sparkles, CheckCircle2,
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SpendChart from '../components/charts/SpendChart'
import DecisionDonut from '../components/charts/DecisionDonut'
import { getDashboard } from '../lib/api'

const guardrails = ['Spending Limits', 'Merchant Rules', 'Human Approval', 'AI Risk Analysis', 'Audit Logging']

const pipeline = [
  { label: 'AI SHOPPING AGENT', icon: Bot, tone: 'text-violet-300' },
  { label: 'PAYGUARD', icon: ShieldCheck, tone: 'text-cyanx' },
  { label: 'APPROVE / REVIEW / BLOCK', icon: Sparkles, tone: 'text-amberx' },
  { label: 'PAYPAL', icon: CreditCard, tone: 'text-emeraldx' },
]

const tone: Record<string, string> = { APPROVED: 'approved', REVIEW_REQUIRED: 'review', BLOCKED: 'blocked' }

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    getDashboard().then(setData).catch((e) => setErr(e.message))
  }, [])

  const activity: any[] = data?.recent_activity ?? []
  const chart = (data?.spending_chart ?? []).map((d: any) => ({ name: d.date.slice(5), volume: d.count }))
  const distribution = [
    { name: 'APPROVED', value: data?.approved ?? 0 },
    { name: 'REVIEW_REQUIRED', value: data?.human_reviews ?? 0 },
    { name: 'BLOCKED', value: data?.blocked_payments ?? 0 },
  ]

  const metrics = [
    { label: 'Monthly Spending', value: `$${(data?.monthly_spending ?? 0).toLocaleString()}`, icon: <ShoppingCart size={20} className="text-white" />, cls: 'metric-blue' },
    { label: 'AI Decisions', value: data?.ai_decisions ?? 0, icon: <ShieldCheck size={20} className="text-white" />, cls: 'metric-violet' },
    { label: 'Human Reviews', value: data?.human_reviews ?? 0, icon: <CheckCheck size={20} className="text-white" />, cls: 'metric-cyan' },
    { label: 'Blocked Payments', value: data?.blocked_payments ?? 0, icon: <Ban size={20} className="text-white" />, cls: 'metric-red' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* ===== HERO — dark navy panel with angled edge ===== */}
      <section className="hero-panel relative px-6 py-10 md:px-10 md:py-12">
        <div className="hero-accent-line" />
        <div className="absolute top-6 right-8 hidden md:flex items-center gap-1.5 opacity-70">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="w-1 rounded-full bg-cyanx/40" style={{ height: 10 + i * 7 }} />
          ))}
        </div>
        <div className="absolute bottom-8 right-10 hidden md:block opacity-60">
          <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
            <path d="M2 58 L40 2 L78 58 L116 2" stroke="#22D3EE" strokeOpacity="0.35" strokeWidth="1.5" />
            <circle cx="40" cy="2" r="3" fill="#22D3EE" fillOpacity="0.5" />
            <circle cx="116" cy="2" r="3" fill="#8B5CF6" fillOpacity="0.5" />
          </svg>
        </div>
        <div className="relative max-w-2xl">
          <p className="text-cyanx tracking-[0.3em] text-[11px] font-semibold uppercase mb-4">AI Payment Authorization</p>
          <h2 className="font-display text-3xl md:text-[40px] font-bold leading-tight text-mist">
            Give AI a wallet.<br />
            <span className="bg-gradient-to-r from-cyanx to-violetx bg-clip-text text-transparent">Keep the control.</span>
          </h2>
          <p className="text-on-dark-muted mt-4 max-w-xl text-sm md:text-base">
            PayGuard stands between autonomous AI agents and payment rails, enforcing your spending rules,
            analyzing contextual risk, and requiring your approval when it matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <Link
              to="/agent"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm shadow-[0_0_24px_rgba(59,130,246,0.45)] hover:shadow-[0_0_34px_rgba(59,130,246,0.7)] transition-shadow duration-200 text-center"
            >
              Launch PayGuard
            </Link>
            <Link
              to="/payment-requests"
              className="px-6 py-3 rounded-xl border border-cyanx/40 text-cyanx font-semibold text-sm hover:bg-cyanx/10 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              View Activity <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {err && <Card><p className="text-red-300 text-sm">Backend unavailable: {err}</p></Card>}

      {/* ===== TRUST PIPELINE ===== */}
      <section className="dark-panel px-5 py-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
          {pipeline.map(({ label, icon: Icon, tone: iconTone }, i) => (
            <div key={label} className="flex items-center gap-2 md:gap-3 flex-1">
              <div className="pipeline-node flex items-center gap-2.5 px-4 py-2.5 min-w-0">
                <Icon size={16} className={`${iconTone} shrink-0`} />
                <span className="text-[11px] font-bold tracking-widest text-on-dark truncate">{label}</span>
              </div>
              {i < pipeline.length - 1 && (
                <>
                  <div className="pipeline-line hidden md:block" />
                  <ArrowRight size={14} className="text-cyanx/70 hidden md:block shrink-0" />
                  <div className="pipeline-line-v md:hidden mx-auto" />
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== METRIC CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className={`${m.cls} rounded-2xl p-5 text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl`}>
            <div className="flex items-start justify-between">
              <p className="text-white text-[11px] uppercase tracking-widest font-semibold [text-shadow:0_1px_2px_rgba(2,6,23,0.45)]">{m.label}</p>
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">{m.icon}</div>
            </div>
            <p className="mt-3 font-display text-2xl md:text-3xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      {/* ===== ANALYTICS — dark panels on light canvas ===== */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 dark-panel !rounded-[1.25rem] !border-electric/20">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-mist">Payment Activity</h3>
              <p className="text-on-dark-subtle text-xs mt-0.5">AI-authorized payment activity over time</p>
            </div>
            <Badge label="REAL DATA" tone="cyan" />
          </div>
          <SpendChart data={chart} />
        </Card>

        <Card className="dark-panel !rounded-[1.25rem] !border-electric/20">
          <h3 className="font-display font-bold text-mist">AI Decision Distribution</h3>
          <p className="text-on-dark-subtle text-xs mt-0.5 mb-2">Deterministic outcomes from the policy engine</p>
          <DecisionDonut data={distribution} />
          <div className="flex flex-col gap-2 mt-3">
            {distribution.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-on-dark-muted">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: d.name === 'APPROVED' ? '#22C55E' : d.name === 'REVIEW_REQUIRED' ? '#F59E0B' : '#EF4444' }}
                  />
                  {d.name.replace('_', ' ')}
                </span>
                <span className="font-semibold text-mist">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ===== RECENT ACTIVITY + GUARDRAILS ===== */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="light-card-surface lg:col-span-2 !bg-white !border-slate-200/80 !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.05)]">
          <h3 className="font-display font-bold text-on-light">Recent Payment Activity</h3>
          <p className="text-on-light-muted text-xs mt-0.5 mb-4">Latest AI purchase requests decided by PayGuard</p>
          {activity.length === 0 ? (
            <p className="text-on-light-faint text-sm py-8 text-center">No payment requests yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activity.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 transition-all duration-200 hover:border-electric/40 hover:shadow-[0_8px_20px_rgba(59,130,246,0.08)]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-on-light truncate">{a.merchant} {a.item_summary && <span className="text-on-light-muted font-normal">· {a.item_summary}</span>}</p>
                    <p className="text-sm text-on-light-muted">{a.currency ?? 'USD'} {a.amount}</p>
                  </div>
                  <Badge label={a.decision.replace('_', ' ')} tone={tone[a.decision]} surface="light" />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="dark-panel dark-panel-glow !rounded-[1.25rem] !border-electric/20">
          <h3 className="font-display font-bold text-mist">PayGuard Protection</h3>
          <p className="text-on-dark-subtle text-xs mt-0.5 mb-4">Active guardrails enforced by deterministic code</p>
          <ul className="flex flex-col gap-3">
            {guardrails.map((g) => (
              <li key={g} className="flex items-center justify-between rounded-xl border border-emeraldx/20 bg-emeraldx/5 px-4 py-2.5">
                <span className="text-sm text-on-dark-muted">{g}</span>
                <span className="flex items-center gap-1.5 text-emeraldx font-semibold text-xs">
                  <CheckCircle2 size={14} className="drop-shadow-[0_0_6px_rgba(34,197,94,0.7)]" /> ACTIVE
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
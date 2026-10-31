import { Link } from 'react-router-dom'
import { ShieldCheck, Bot, Lock, Activity, ArrowDown } from 'lucide-react'

const flow = ['AI SHOPPING AGENT', 'PAYGUARD', 'APPROVE / REVIEW / BLOCK', 'PAYPAL SANDBOX', 'PAYMENT']

const features = [
  { icon: Lock, title: 'POLICY CONTROL', text: 'Define exactly what your AI can spend.', tone: 'text-electric', glow: 'hover:shadow-[0_0_28px_rgba(59,130,246,0.35)]' },
  { icon: Bot, title: 'AI RISK REASONING', text: 'Understand unusual purchases before money moves.', tone: 'text-violet-300', glow: 'hover:shadow-[0_0_28px_rgba(139,92,246,0.35)]' },
  { icon: Activity, title: 'HUMAN APPROVAL', text: 'Keep final control over sensitive transactions.', tone: 'text-amberx', glow: 'hover:shadow-[0_0_28px_rgba(245,158,11,0.35)]' },
  { icon: ShieldCheck, title: 'AUDITABLE PAYMENTS', text: 'Every decision is recorded and explained.', tone: 'text-emeraldx', glow: 'hover:shadow-[0_0_28px_rgba(34,197,94,0.35)]' },
]

const steps = [
  'Set your rules',
  'AI requests a purchase',
  'PayGuard evaluates it',
  'You approve or block when required',
  'Payment proceeds through PayPal Sandbox',
]

export default function Landing() {
  return (
    <div className="min-h-screen grid-bg bg-navy flex flex-col items-center px-6 py-14 text-center text-on-dark">
      <div className="flex items-center gap-3 mb-4">
        <ShieldCheck size={40} className="text-cyanx drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
        <span className="font-display text-4xl md:text-6xl font-bold bg-gradient-to-r from-electric via-cyanx to-magentax bg-clip-text text-transparent">
          PAYGUARD
        </span>
      </div>
      <p className="text-cyanx tracking-[0.35em] text-xs md:text-sm font-semibold uppercase mb-8">
        AI Payment Authorization Agent
      </p>

      <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight">
        Give AI a wallet.<br />
        <span className="bg-gradient-to-r from-cyanx to-violetx bg-clip-text text-transparent">Keep the control.</span>
      </h1>
      <p className="text-on-dark-muted max-w-2xl mt-5">
        PayGuard stands between autonomous AI agents and payment rails, enforcing your spending rules,
        analyzing contextual risk, and requiring your approval when it matters.
      </p>
      <p className="text-on-dark-subtle mt-2 text-sm">AI reasons. Code enforces. Humans control.</p>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link to="/dashboard" className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold shadow-[0_0_24px_rgba(59,130,246,0.5)] hover:shadow-[0_0_34px_rgba(59,130,246,0.75)] transition-shadow duration-200">
          Launch PayGuard
        </Link>
        <a href="#how" className="px-8 py-3 rounded-xl glass-card text-cyanx font-semibold hover:border-cyanx/50 transition-colors duration-200">
          See How It Works
        </a>
      </div>

      {/* Flow diagram */}
      <div className="mt-14 flex flex-col items-center gap-0">
        {flow.map((node, i) => (
          <div key={node} className="flex flex-col items-center">
            <div
              className={`glass-card px-6 py-3 rounded-2xl font-display text-sm font-bold tracking-wide ${
                i === 1
                  ? 'border border-cyanx/60 text-cyanx shadow-[0_0_24px_rgba(34,211,238,0.4)]'
                  : 'text-on-dark'
              }`}
            >
              {node}
            </div>
            {i < flow.length - 1 && (
              <div className="flex flex-col items-center py-1">
                <span className="w-px h-5 bg-gradient-to-b from-cyanx/70 to-violetx/40 animate-pulse" />
                <ArrowDown size={14} className="text-cyanx/80" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-5xl w-full">
        {features.map(({ icon: Icon, title, text, tone, glow }) => (
          <div key={title} className={`glass-card p-5 text-left transition-all duration-300 hover:-translate-y-1 ${glow}`}>
            <Icon className={tone} size={26} />
            <h3 className="font-display font-bold mt-3 text-sm tracking-wider">{title}</h3>
            <p className="text-on-dark-muted text-sm mt-1">{text}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <h2 id="how" className="font-display text-2xl md:text-3xl font-bold mt-20">How PayGuard protects your money</h2>
      <ol className="mt-8 flex flex-col gap-3 w-full max-w-2xl text-left">
        {steps.map((s, i) => (
          <li key={s} className="glass-card glass-card-hover px-5 py-4 flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-electric to-cyanx text-navy font-bold flex items-center justify-center">{i + 1}</span>
            <span className="text-on-dark">{s}</span>
          </li>
        ))}
      </ol>

      <h2 className="font-display text-2xl md:text-4xl font-bold mt-20 leading-tight">
        Let AI shop.<br />
        <span className="bg-gradient-to-r from-amberx to-redx bg-clip-text text-transparent">Don't let AI decide how your money moves.</span>
      </h2>
      <Link to="/dashboard" className="mt-8 px-8 py-3 rounded-xl bg-gradient-to-r from-cyanx to-emeraldx text-navy font-bold shadow-[0_0_24px_rgba(34,211,238,0.4)] transition-shadow duration-200">
        Launch PayGuard
      </Link>
    </div>
  )
}

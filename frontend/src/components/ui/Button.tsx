import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variants = {
  // Solid-fill variants keep the brand hues but use 600-level fills so the
  // white/navy labels clear WCAG AA (white on #3B82F6 is only ~3.7:1).
  primary: 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_18px_rgba(59,130,246,0.4)] hover:shadow-[0_0_26px_rgba(59,130,246,0.6)]',
  cyan: 'bg-gradient-to-r from-cyanx to-electric text-navy font-semibold shadow-[0_0_18px_rgba(34,211,238,0.35)] hover:shadow-[0_0_26px_rgba(34,211,238,0.55)]',
  danger: 'bg-gradient-to-r from-red-600 to-fuchsia-600 text-white shadow-[0_0_18px_rgba(239,68,68,0.35)]',
  ghost: 'glass-card text-on-dark-muted hover:text-cyanx',
  emerald: 'bg-gradient-to-r from-emeraldx to-cyanx text-navy font-semibold shadow-[0_0_18px_rgba(34,197,94,0.35)]',
} as const

export default function Button({
  children, variant = 'primary', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: keyof typeof variants }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:shadow-none disabled:saturate-50 disabled:opacity-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

import type { ReactNode } from 'react'

export default function StatCard({ label, value, icon, accent = 'from-electric to-cyanx' }: { label: string; value: ReactNode; icon?: ReactNode; accent?: string }) {
  return (
    <div className="glass-card glass-card-hover p-5">
      <div className="flex items-center justify-between">
        <p className="text-on-dark-subtle text-xs uppercase tracking-widest font-semibold">{label}</p>
        {icon}
      </div>
      <p className={`mt-2 font-display text-3xl font-bold bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>{value}</p>
    </div>
  )
}

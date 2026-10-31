import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import { AlertTriangle, ShieldQuestion, ShieldCheck } from 'lucide-react'
import { getRisk } from '../lib/api'

export default function Risk() {
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    getRisk().then(setData).catch((e) => setErr(e.message))
  }, [])

  const decisions: any[] = data?.risk_decisions ?? []

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl font-bold">Contextual Risk Center</h2>
        <p className="text-on-light-muted text-sm mt-1">AI-generated context signals. Advisory only — deterministic rules make the final decision. Not a guaranteed fraud detector.</p>
      </div>
      {err && <Card><p className="text-red-300 text-sm">{err}</p></Card>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="High Risk" value={data?.high ?? 0} accent="from-red-400 to-fuchsia-300" icon={<AlertTriangle className="text-red-400" size={20} />} />
        <StatCard label="Medium Risk" value={data?.medium ?? 0} accent="from-amber-400 to-fuchsia-300" icon={<ShieldQuestion className="text-amberx" size={20} />} />
        <StatCard label="Low Risk" value={data?.low ?? 0} accent="from-emeraldx to-cyanx" icon={<ShieldCheck className="text-emeraldx" size={20} />} />
      </div>
      <Card>
        <h3 className="font-display font-bold mb-4">Risk Signals</h3>
        {decisions.length === 0 && !err ? (
          <p className="text-on-dark-subtle text-sm py-8 text-center">No spending history available</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {decisions.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-electric/15 bg-navy-2/50 px-4 py-3">
                <span className="text-on-dark-muted text-sm">{(d.signals ?? []).join(' · ')}</span>
                <Badge label={d.risk_level ?? 'N/A'} tone={d.risk_level === 'HIGH' ? 'blocked' : d.risk_level === 'MEDIUM' ? 'review' : 'approved'} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

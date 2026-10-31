import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function SpendChart({ data }: { data?: { name: string; volume: number }[] }) {
  const chartData = data && data.length > 0 ? data : [
    { name: 'Mon', volume: 0 }, { name: 'Tue', volume: 0 }, { name: 'Wed', volume: 0 },
    { name: 'Thu', volume: 0 }, { name: 'Fri', volume: 0 }, { name: 'Sat', volume: 0 }, { name: 'Sun', volume: 0 },
  ]
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" stroke="#CBD5E1" fontSize={12} />
        <YAxis stroke="#CBD5E1" fontSize={12} />
        <Tooltip contentStyle={{ background: '#101D32', border: '1px solid #3B82F655', borderRadius: 12, color: '#F8FAFC' }} />
        <Area type="monotone" dataKey="volume" stroke="#3B82F6" fill="url(#spend)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

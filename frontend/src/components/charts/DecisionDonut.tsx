import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS: Record<string, string> = {
  APPROVED: '#22C55E',
  REVIEW_REQUIRED: '#F59E0B',
  BLOCKED: '#EF4444',
}

export default function DecisionDonut({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const chartData = data.filter((d) => d.value > 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={64}
            outerRadius={88}
            paddingAngle={3}
            strokeWidth={0}
          >
            {chartData.map((d) => (
              <Cell key={d.name} fill={COLORS[d.name] ?? '#3B82F6'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#101D32',
              border: '1px solid #3B82F655',
              borderRadius: 12,
              color: '#F8FAFC',
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="font-display text-3xl font-bold text-mist">{total}</p>
        <p className="text-[10px] tracking-[0.2em] text-on-dark-subtle font-semibold">DECISIONS</p>
      </div>
    </div>
  )
}
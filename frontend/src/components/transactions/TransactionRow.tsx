import Badge from '../ui/Badge'

export type Tx = {
  id: string
  merchant: string
  amount: string
  status: 'APPROVED' | 'REVIEW_REQUIRED' | 'BLOCKED'
  risk: string
}

const tone = { APPROVED: 'approved', REVIEW_REQUIRED: 'review', BLOCKED: 'blocked' } as const

export default function TransactionRow({ tx }: { tx: Tx }) {
  return (
    <tr className="hover:bg-electric/5 transition-colors duration-200">
      <td className="py-3 pr-4 font-mono text-cyanx text-xs">{tx.id}</td>
      <td className="py-3 pr-4">{tx.merchant}</td>
      <td className="py-3 pr-4 font-semibold">{tx.amount}</td>
      <td className="py-3 pr-4"><Badge label={tx.status.replace('_', ' ')} tone={tone[tx.status]} /></td>
      <td className="py-3 text-on-dark-muted">{tx.risk}</td>
    </tr>
  )
}

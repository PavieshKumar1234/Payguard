import type { ReactNode } from 'react'

export default function Table({ headers, children }: { headers: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-on-dark-subtle border-b border-electric/15">
            {headers.map((h, i) => <th key={i} className="py-2 pr-4 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-electric/10">{children}</tbody>
      </table>
    </div>
  )
}

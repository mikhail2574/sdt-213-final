import type { ReactNode } from 'react'

/** Plain table: muted header, thin rows, horizontal scroll on narrow screens. */
export function Table({ headers, children }: { headers: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {headers.map((header, index) => (
              <th key={index} scope="col" className="py-3 pr-6 text-xs font-medium whitespace-nowrap text-muted">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`py-3.5 pr-6 align-middle ${className}`}>{children}</td>
}

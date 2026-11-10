import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export default function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-sm underline underline-offset-4 hover:text-lilac-deep">
      {children}
    </Link>
  )
}

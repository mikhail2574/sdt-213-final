import { NavLink } from 'react-router-dom'
import type { NavItem } from './navigation'

interface NavGroupProps {
  items: NavItem[]
  heading?: string
  /** Small counters shown next to a link, keyed by its path (e.g. unread notifications). */
  counts?: Record<string, number>
}

export default function NavGroup({ items, heading, counts = {} }: NavGroupProps) {
  if (items.length === 0) return null
  return (
    <div className="flex gap-1 md:flex-col">
      {heading && <p className="hidden px-3 pt-6 pb-2 text-xs text-muted md:block">{heading}</p>}
      {items.map(item => {
        const count = counts[item.to] ?? 0
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                isActive ? 'bg-lilac font-semibold' : 'text-muted hover:text-ink'
              }`
            }
          >
            {item.label}
            {count > 0 && (
              <span className="text-xs font-semibold text-lilac-deep" aria-label={`${count} unread`}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </NavLink>
        )
      })}
    </div>
  )
}

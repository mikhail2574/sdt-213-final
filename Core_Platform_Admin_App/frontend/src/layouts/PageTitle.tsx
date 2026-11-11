import { useLocation } from 'react-router-dom'
import { findNavItem } from './navigation'

/** The page's only top-level heading, taken from the navigation entry. */
export default function PageTitle() {
  const { pathname } = useLocation()
  const item = findNavItem(pathname)
  return <h1 className="mb-8 text-3xl font-semibold tracking-tight">{item?.title ?? item?.label ?? 'Core Platform'}</h1>
}

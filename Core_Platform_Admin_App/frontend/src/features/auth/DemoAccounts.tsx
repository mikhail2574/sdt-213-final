import { DEMO_ACCOUNTS } from '../../lib/constants'

interface DemoAccountsProps {
  onSelect: (email: string, password: string) => void
}

/** Development-only shortcuts that prefill the sign-in form with a seeded account. */
export default function DemoAccounts({ onSelect }: DemoAccountsProps) {
  // Seeded demo passwords must never appear in a production build.
  if (!import.meta.env.DEV) return null
  return (
    <div className="mt-12 text-sm">
      <p className="mb-2 text-muted">Demo accounts</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {DEMO_ACCOUNTS.map(account => (
          <button key={account.email} type="button" onClick={() => onSelect(account.email, account.password)} className="hover:text-lilac-deep">
            {account.label}
          </button>
        ))}
      </div>
    </div>
  )
}

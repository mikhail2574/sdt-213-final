import { useSearchParams } from 'react-router-dom'
import AuthHeading from './AuthHeading'
import AuthLink from './AuthLink'
import ConfirmEmail from './ConfirmEmail'
import SetPasswordForm from './SetPasswordForm'

/**
 * Landing page for every link sent by email: /email-link?token=...&type=confirm|reset|invite
 * `confirm` activates an applicant; `reset` and `invite` ask for a new password.
 */
export default function EmailLinkPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const type = params.get('type') ?? 'reset'

  if (!token) {
    return (
      <>
        <AuthHeading title="This link is not valid" description="It is incomplete or has expired. Request a new one." />
        <AuthLink to="/forgot-password">Request a new link</AuthLink>
      </>
    )
  }

  if (type === 'confirm') {
    return (
      <>
        <AuthHeading title="Confirming your email" />
        <ConfirmEmail token={token} />
      </>
    )
  }

  return (
    <>
      <AuthHeading
        title={type === 'invite' ? 'Set up your account' : 'Choose a new password'}
        description={type === 'invite' ? 'Choose a password to activate your university account.' : undefined}
      />
      <SetPasswordForm token={token} />
    </>
  )
}

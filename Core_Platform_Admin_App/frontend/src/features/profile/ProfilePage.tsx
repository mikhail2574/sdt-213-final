import ChangePasswordForm from './ChangePasswordForm'
import OfficialData from './OfficialData'
import ProfileForm from './ProfileForm'

/** My profile: editable contact details on the left, official data and password on the right. */
export default function ProfilePage() {
  return (
    <div className="grid items-start gap-14 lg:grid-cols-2">
      <ProfileForm />
      <div className="flex flex-col gap-14">
        <OfficialData />
        <ChangePasswordForm />
      </div>
    </div>
  )
}

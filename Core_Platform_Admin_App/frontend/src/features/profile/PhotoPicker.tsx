import { useId, useState, type ChangeEvent } from 'react'
import { meApi } from '../../api/meApi'
import useAuth, { useCurrentUser } from '../../auth/useAuth'
import useAction from '../../hooks/useAction'
import { imageToJpeg } from '../../lib/image'
import Avatar from '../../components/ui/Avatar'
import useProfilePhoto from './useProfilePhoto'

/** Profile photo with a "Change photo" file picker; the image is scaled down and uploaded right away. */
export default function PhotoPicker() {
  const user = useCurrentUser()
  const { refreshUser } = useAuth()
  const inputId = useId()
  const [version, setVersion] = useState(0)
  const photo = useProfilePhoto(user.photo_url, version)

  const upload = useAction(async (file: File) => {
    await meApi.uploadPhoto(await imageToJpeg(file))
    await refreshUser()
    setVersion(previous => previous + 1)
    return true
  })

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void upload.run(file)
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar name={user.name} photoUrl={photo} size="lg" />
      <div>
        <label htmlFor={inputId} className="cursor-pointer text-sm underline underline-offset-4 hover:text-lilac-deep">
          {upload.busy ? 'Uploading…' : 'Change photo'}
        </label>
        <input id={inputId} type="file" accept="image/png,image/jpeg" className="sr-only" disabled={upload.busy} onChange={pick} />
        {upload.error && (
          <p role="alert" className="mt-1 text-xs">
            {upload.error}
          </p>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { meApi } from '../../api/meApi'

const UPLOADED_PHOTO = '/api/v1/me/photo'

/**
 * Returns a displayable URL for the user's photo. An uploaded photo is served only with the bearer
 * token, so it is fetched as a blob; an external HTTPS photo URL is used as it is.
 * `version` changes after an upload to load the new photo.
 */
export default function useProfilePhoto(photoUrl: string | null, version: number): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (photoUrl !== UPLOADED_PHOTO) return undefined
    let url: string | null = null
    let cancelled = false
    meApi
      .photo()
      .then(blob => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setObjectUrl(url)
      })
      .catch(() => setObjectUrl(null))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [photoUrl, version])

  if (!photoUrl) return null
  return photoUrl === UPLOADED_PHOTO ? objectUrl : photoUrl
}

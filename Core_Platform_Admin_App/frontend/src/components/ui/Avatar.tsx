import { initials } from '../../lib/format'

const SIZES = {
  sm: 'size-8 text-xs',
  lg: 'size-16 text-lg',
}

interface AvatarProps {
  name: string
  photoUrl?: string | null
  size?: keyof typeof SIZES
}

export default function Avatar({ name, photoUrl, size = 'sm' }: AvatarProps) {
  const classes = `${SIZES[size]} shrink-0 rounded-full`
  if (photoUrl) return <img src={photoUrl} alt="" className={`${classes} object-cover`} />
  return (
    <span aria-hidden="true" className={`${classes} inline-grid place-items-center bg-sky font-semibold`}>
      {initials(name)}
    </span>
  )
}

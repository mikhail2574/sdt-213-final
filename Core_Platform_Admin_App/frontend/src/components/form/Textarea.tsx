import type { TextareaHTMLAttributes } from 'react'
import { CONTROL_CLASSES } from './controlStyles'

export default function Textarea({ className = '', rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={`${CONTROL_CLASSES} resize-y ${className}`} {...props} />
}

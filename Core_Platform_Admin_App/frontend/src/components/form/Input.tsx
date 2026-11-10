import type { InputHTMLAttributes } from 'react'
import { CONTROL_CLASSES } from './controlStyles'

export default function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL_CLASSES} ${className}`} {...props} />
}

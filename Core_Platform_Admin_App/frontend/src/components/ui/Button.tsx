import type { ButtonHTMLAttributes } from 'react'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows `busyText` and disables the button while an action runs. */
  busy?: boolean
  busyText?: string
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  busy = false,
  busyText,
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || busy} {...props}>
      {busy && busyText ? busyText : children}
    </button>
  )
}

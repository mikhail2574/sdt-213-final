import type { InputHTMLAttributes, ReactNode } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

export default function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 text-sm ${className}`}>
      <input type="checkbox" className="size-4 shrink-0 accent-lilac-deep" {...props} />
      <span>{label}</span>
    </label>
  )
}

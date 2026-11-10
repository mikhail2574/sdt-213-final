import type { SelectHTMLAttributes } from 'react'
import { CONTROL_CLASSES } from './controlStyles'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: (SelectOption | string)[]
  /** Adds a first option with an empty value, e.g. "All roles". */
  placeholder?: string
}

export default function Select({ options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <select className={`${CONTROL_CLASSES} ${className}`} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(option => {
        const { value, label } = typeof option === 'string' ? { value: option, label: option } : option
        return (
          <option key={value} value={value}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

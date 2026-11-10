export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
export type ButtonSize = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors ' +
  'disabled:cursor-not-allowed disabled:text-muted'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-lilac text-ink hover:bg-lilac-strong',
  secondary: 'bg-sky text-ink hover:bg-sky-strong',
  quiet: 'text-ink underline-offset-4 hover:underline',
  danger: 'bg-rose text-ink hover:bg-rose-strong',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
}

/** Shared by <Button> and router links that should look like buttons. */
export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra = ''): string {
  const padding = variant === 'quiet' ? 'px-0 py-1 text-sm' : SIZES[size]
  return [BASE, VARIANTS[variant], padding, extra].join(' ')
}

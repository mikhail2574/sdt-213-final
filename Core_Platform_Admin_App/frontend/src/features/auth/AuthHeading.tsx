interface AuthHeadingProps {
  title: string
  description?: string
}

export default function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
    </div>
  )
}

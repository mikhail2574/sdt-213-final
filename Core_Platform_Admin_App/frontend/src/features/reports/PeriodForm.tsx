import { useState, type FormEvent } from 'react'
import Button from '../../components/ui/Button'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'

interface PeriodFormProps {
  period: string
  onSubmit: (period: string) => void
}

/** The period every module reports on, e.g. "Fall 2026". */
export default function PeriodForm({ period, onSubmit }: PeriodFormProps) {
  const [value, setValue] = useState(period)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
      <div className="w-56">
        <Field label="Report period">
          <Input required maxLength={100} value={value} onChange={e => setValue(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" variant="secondary">
        Generate report
      </Button>
    </form>
  )
}

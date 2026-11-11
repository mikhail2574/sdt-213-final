import type { ReactNode } from 'react'
import { messagesApi } from '../../api/messagesApi'
import { useCurrentUser } from '../../auth/useAuth'
import useAsync from '../../hooks/useAsync'
import { ROLES } from '../../lib/constants'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import { audienceKinds, type AudienceKind } from './audience'

interface AudienceFieldsProps {
  kind: AudienceKind
  target: string
  onChange: (kind: AudienceKind, target: string) => void
  /** Field shown next to the audience type, e.g. the channel. */
  children?: ReactNode
}

/** Audience type plus its target: a role, a department or one of the user's course groups. */
export default function AudienceFields({ kind, target, onChange, children }: AudienceFieldsProps) {
  const user = useCurrentUser()
  const admin = user.role === 'Administrator'
  const groups = useAsync(messagesApi.groups, [])
  const courses = (groups.data ?? []).filter(group => group.group_type === 'COURSE')

  function changeKind(next: AudienceKind) {
    if (next === 'ROLE') onChange(next, 'Student')
    else if (next === 'DEPARTMENT') onChange(next, admin ? '' : (user.department ?? ''))
    else if (next === 'COURSE') onChange(next, courses[0]?.code ?? '')
    else onChange(next, '')
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Audience">
          <Select options={audienceKinds(user)} value={kind} onChange={e => changeKind(e.target.value as AudienceKind)} />
        </Field>
        {children}
      </div>
      {kind === 'ROLE' && (
        <Field label="Role">
          <Select options={ROLES} value={target} onChange={e => onChange(kind, e.target.value)} />
        </Field>
      )}
      {kind === 'DEPARTMENT' && (
        <Field label="Department">
          <Input
            required
            maxLength={100}
            readOnly={!admin}
            placeholder="e.g. Computer Science"
            value={target}
            onChange={e => onChange(kind, e.target.value)}
          />
        </Field>
      )}
      {kind === 'COURSE' && (
        <Field label="Course group">
          <Select
            placeholder={courses.length ? undefined : 'No course groups'}
            options={courses.map(course => ({ value: course.code, label: course.title }))}
            value={target}
            onChange={e => onChange(kind, e.target.value)}
          />
        </Field>
      )}
    </>
  )
}

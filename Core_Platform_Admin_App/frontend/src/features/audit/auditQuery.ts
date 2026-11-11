import type { AuditFilters } from '../../types/api'

/** Values of the filter form: dates as yyyy-mm-dd from date inputs. */
export type AuditFilterValues = Required<AuditFilters>

export const NO_FILTERS: AuditFilterValues = { q: '', from: '', to: '', actor: '', action: '', result: '' }

/** The API expects instants: the start of the "from" day and the end of the "to" day, in local time. */
export function toAuditQuery(values: AuditFilterValues): AuditFilters {
  return {
    ...values,
    from: values.from ? new Date(`${values.from}T00:00:00`).toISOString() : '',
    to: values.to ? new Date(`${values.to}T23:59:59.999`).toISOString() : '',
  }
}

import { request, requestFile } from './client'
import { toList, type ListResponse } from '../lib/collections'
import type { AdminSettings, AuditEntry, AuditFilters, Dashboard } from '../types/api'

export const adminApi = {
  /** User statistics, recent activity and service statuses (also used by System Status). */
  dashboard: () => request<Dashboard>('/admin/dashboard'),

  settings: () => request<AdminSettings>('/admin/settings'),

  /** Saves settings, module switches and role permissions as one object. */
  saveSettings: (settings: AdminSettings) =>
    request<AdminSettings | null>('/admin/settings', { method: 'PUT', body: settings }),

  audit: (filters: AuditFilters) =>
    request<ListResponse<AuditEntry>>('/admin/audit', { params: { ...filters } }).then(toList),

  auditCsv: (filters: AuditFilters) => requestFile('/admin/audit', { params: { ...filters, format: 'csv' } }),
}

import { request, requestFile, type QueryParams } from './client'
import type { AdminSettings, AuditEntry, AuditFilters, Dashboard } from '../types/api'

export const adminApi = {
  /** User statistics, recent activity and service statuses (also used by System Status). */
  dashboard: () => request<Dashboard>('/admin/dashboard'),

  settings: () => request<AdminSettings>('/admin/settings'),

  /** Saves settings, module switches and role permissions as one object and returns the saved state. */
  saveSettings: (settings: AdminSettings) =>
    request<AdminSettings>('/admin/settings', {
      method: 'PUT',
      body: {
        settings: settings.settings,
        modules: settings.modules.map(({ code, enabled }) => ({ code, enabled })),
        roles: settings.roles.map(({ code, permissions }) => ({ code, permissions })),
      },
    }),

  /** Newest first; pass the id of the last loaded record as `before` for older records. */
  audit: (filters: AuditFilters, before?: number) =>
    request<AuditEntry[]>('/admin/audit', { params: { ...filters, before } as QueryParams }),

  auditCsv: (filters: AuditFilters) => requestFile('/admin/audit', { params: { ...filters, format: 'csv' } }),
}

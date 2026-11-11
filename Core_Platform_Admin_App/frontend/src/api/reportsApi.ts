import { request, requestFile } from './client'
import type { Report } from '../types/api'

export const reportsApi = {
  /** Cross-module report for administrators and viewers, own courses for faculty. `period` is required. */
  get: (period: string) => request<Report>('/reports', { params: { period } }),
  csv: (period: string) => requestFile('/reports', { params: { period, format: 'csv' } }),
}

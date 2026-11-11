import { request, requestFile } from './client'
import type { Me, ProfileUpdate } from '../types/api'

export const meApi = {
  get: () => request<Me>('/me'),

  update: (changes: ProfileUpdate) => request<Me>('/me', { method: 'PATCH', body: changes }),

  /** PNG or JPEG, sent as raw bytes. */
  uploadPhoto: (photo: Blob) => request<{ photo_url: string }>('/me/photo', { method: 'POST', body: photo }),

  /** The photo endpoint needs the bearer token, so it is loaded as a blob instead of an <img> URL. */
  photo: () => requestFile('/me/photo').then(file => file.blob),
}

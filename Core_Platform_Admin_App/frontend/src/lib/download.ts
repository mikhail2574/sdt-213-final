import type { DownloadedFile } from '../api/client'

/** Saves a file returned by the API (CSV exports) to the user's device. */
export function saveFile({ blob, filename }: DownloadedFile, fallbackName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || fallbackName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

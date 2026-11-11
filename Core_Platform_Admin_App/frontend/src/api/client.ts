/**
 * Thin fetch wrapper for the Core Platform REST API (/api/v1).
 * - attaches the bearer token
 * - sends and receives JSON (snake_case, as the backend defines it)
 * - turns `{ "detail": "..." }` error bodies into ApiError
 */
const BASE_URL = '/api/v1'
const TOKEN_KEY = 'core_token'

type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: QueryParams
  /** Send the bearer token (default true). */
  auth?: boolean
}

export interface DownloadedFile {
  blob: Blob
  filename?: string
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function buildUrl(path: string, params?: QueryParams) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const queryString = query.toString()
  return BASE_URL + path + (queryString ? `?${queryString}` : '')
}

async function send(path: string, { method = 'GET', body, params, auth = true }: RequestOptions = {}) {
  const token = auth ? tokenStore.get() : null
  const headers: Record<string, string> = {}
  // Files (profile photo) are sent as raw bytes with their own type; everything else is JSON.
  const isFile = body instanceof Blob
  if (body !== undefined) headers['Content-Type'] = isFile ? body.type : 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: isFile ? body : body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0)
  }

  if (!response.ok) {
    const data: { detail?: unknown } = await response.json().catch(() => ({}))
    const message = typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`
    // An authenticated request rejected with 401 means the session is gone (expired, revoked or idle timeout).
    if (response.status === 401 && token && token === tokenStore.get()) unauthorizedHandler?.()
    throw new ApiError(message, response.status)
  }
  return response
}

export async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const response = await send(path, options)
  if (response.status === 204) return null as T
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

export async function requestFile(path: string, options?: RequestOptions): Promise<DownloadedFile> {
  const response = await send(path, options)
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const filename = disposition.match(/filename="?([^";]+)"?/)?.[1]
  return { blob: await response.blob(), filename }
}

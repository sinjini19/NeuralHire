import axios from 'axios'

// Single Axios instance. The base URL comes from an env var, so switching
// between local and deployed backends needs no code change.
export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL ?? 'http://localhost:8000',
  timeout: 15000,
})

/** Turns any thrown error into a message safe to show the user. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    // FastAPI validation errors (422) arrive as a list: [{ loc: ['body','title'], msg: '...' }]
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const field = (d.loc ?? []).filter((p) => p !== 'body' && p !== 'query').join('.')
          const msg = String(d.msg ?? 'Invalid value').replace(/^Value error, /, '')
          return field ? `${field}: ${msg}` : msg
        })
        .join(' ')
    }
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
    if (!error.response) return 'Cannot reach the server. Is the backend running?'
    return `Request failed (${error.response.status}).`
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

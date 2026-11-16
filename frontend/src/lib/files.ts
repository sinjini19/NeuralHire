// Client-side checks give instant feedback. The backend repeats all of them,
// because anything running in a browser can be bypassed.
export const MAX_UPLOAD_MB = 5
export const MAX_FILES_PER_BATCH = 10

/** Returns an error message, or null if the file looks acceptable. */
export function validatePdf(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Only .pdf files are accepted.'
  if (file.type && file.type !== 'application/pdf') return 'This file is not a PDF.'
  if (file.size === 0) return 'The file is empty.'
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `File is larger than ${MAX_UPLOAD_MB} MB.`
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

/**
 * Client-side S3 upload service — talks to the BFF /api/upload route, which
 * stores the file in S3 and returns its key + URL. Use this from client
 * components instead of calling fetch() directly.
 *
 * NOTE: distinct from crud.ts's `uploadFile(path, formData)`, which posts a
 * multipart body to a Spring endpoint. These `*ToS3` helpers persist directly
 * to S3 and leave the /api/proxy → Spring flow untouched.
 */
import { NEXT_API } from '@/config/constants/api'

export type S3UploadedFile = {
  /** S3 object key — persist this (e.g. via a Spring save call). */
  key: string
  /** Public object URL (resolves only for publicly-readable objects). */
  url: string
  size: number
  contentType: string
}

export type S3UploadOptions = {
  /** Key prefix / "folder", e.g. 'student-photos'. */
  prefix?: string
  /** Exact object key (overrides prefix + generated name). */
  key?: string
}

/** Upload a single file to S3 via the BFF. Throws on non-2xx. */
export async function uploadFileToS3(file: File, options: S3UploadOptions = {}): Promise<S3UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  if (options.prefix) form.append('prefix', options.prefix)
  if (options.key) form.append('key', options.key)

  const res = await fetch(NEXT_API.UPLOAD, { method: 'POST', body: form })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.message ?? `Upload failed (${res.status})`)
  }
  return res.json() as Promise<S3UploadedFile>
}

/** Upload several files to S3; resolves once all have completed. */
export function uploadFilesToS3(
  files: File[],
  options: S3UploadOptions = {},
): Promise<S3UploadedFile[]> {
  return Promise.all(files.map((file) => uploadFileToS3(file, options)))
}

/** Delete a previously-uploaded S3 object by its key. Throws on non-2xx. */
export async function deleteFileFromS3(key: string): Promise<void> {
  const res = await fetch(`${NEXT_API.UPLOAD}?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.message ?? `Delete failed (${res.status})`)
  }
}

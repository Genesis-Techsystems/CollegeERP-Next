/**
 * BFF Upload Route — POST /api/upload  (and DELETE /api/upload?key=...)
 *
 * Session-protected S3 file storage. Accepts multipart/form-data:
 *   - `file`   (required): the file to store
 *   - `prefix` (optional): key prefix / "folder", e.g. 'student-photos'
 *   - `key`    (optional): exact object key (overrides prefix + generated name)
 *
 * Returns { key, url, size, contentType }. The existing /api/proxy → Spring
 * upload flow is untouched; use this only where you want direct S3 storage.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions } from '@/lib/session'
import type { IronSessionData } from '@/types/user'
import { uploadToS3, deleteFromS3 } from '@/lib/s3'

// Reject anything larger than this to protect the server from oversized bodies.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

async function requireSession() {
  const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)
  if (!session.jwt || !session.user) return null
  return session
}

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Session expired' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { message: 'Expected multipart/form-data with a "file" field' },
      { status: 400 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ message: 'Invalid multipart form data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Missing "file" field' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ message: 'Empty file' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { message: `File exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit` },
      { status: 413 },
    )
  }

  const prefixRaw = form.get('prefix')
  const keyRaw = form.get('key')
  const prefix = typeof prefixRaw === 'string' && prefixRaw.trim() ? prefixRaw.trim() : undefined
  const key = typeof keyRaw === 'string' && keyRaw.trim() ? keyRaw.trim() : undefined

  try {
    const body = Buffer.from(await file.arrayBuffer())
    const result = await uploadToS3({
      body,
      contentType: file.type || undefined,
      fileName: file.name,
      prefix,
      key,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('[upload] S3 upload failed:', err)
    return NextResponse.json({ message: 'Upload failed' }, { status: 502 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireSession()
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Session expired' }, { status: 401 })
  }

  const key = request.nextUrl.searchParams.get('key')
  if (!key) {
    return NextResponse.json({ message: 'Missing "key" query param' }, { status: 400 })
  }

  try {
    await deleteFromS3(key)
    return NextResponse.json({ deleted: key }, { status: 200 })
  } catch (err) {
    console.error('[upload] S3 delete failed:', err)
    return NextResponse.json({ message: 'Delete failed' }, { status: 502 })
  }
}

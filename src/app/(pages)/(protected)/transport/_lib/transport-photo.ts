import { MINIO_URL } from '@/config/constants/api'
import { uploadFileToS3 } from '@/services'

/** Same default avatar used on student details / transport list grids. */
export const DEFAULT_TRANSPORT_PASSPORT_PHOTO =
  '/assets/images/avatars/default_Student.png'

export const TRANSPORT_PHOTO_ACCEPT = '.png,.jpg,.jpeg,image/png,image/jpeg'
export const TRANSPORT_PHOTO_INVALID_MESSAGE =
  'Passport photo must be a .png, .jpg, or .jpeg file only.'

const PHOTO_ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg'])
const PHOTO_ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg'])

export function isAllowedTransportPhotoFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (PHOTO_ALLOWED_EXTENSIONS.has(extension)) return true
  return PHOTO_ALLOWED_MIME_TYPES.has(file.type.toLowerCase())
}

/** Resolve stored photoPath (absolute URL, data URL, or MinIO-relative) for <img src>. */
export function resolveTransportPhotoSrc(path: string | null | undefined): string {
  const raw = String(path ?? '').trim()
  if (!raw) return DEFAULT_TRANSPORT_PASSPORT_PHOTO
  if (/^(https?:\/\/|data:|blob:)/i.test(raw)) return raw
  const base = MINIO_URL.replace(/\/$/, '')
  if (!base) return raw
  return `${base}/${raw.replace(/^\/+/, '')}`
}

/**
 * Upload passport image via existing BFF S3 route (same pattern as org logo:
 * pick file in form → upload after validation → persist returned path).
 */
export async function uploadTransportPassportPhoto(
  file: File,
  prefix: 'transport/drivers' | 'transport/helpers',
): Promise<string> {
  if (!isAllowedTransportPhotoFile(file)) {
    throw new Error(TRANSPORT_PHOTO_INVALID_MESSAGE)
  }
  const uploaded = await uploadFileToS3(file, { prefix })
  return uploaded.url || uploaded.key
}

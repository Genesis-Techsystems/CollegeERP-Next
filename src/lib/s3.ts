// S3 object-storage helper — SERVER-SIDE ONLY.
// Never import this into a client component: it reads S3_SECRET_ACCESS_KEY, which
// must never reach the browser. Import only from server routes / server actions.
// (Kept free of the `server-only` package since it isn't resolvable in this install;
// the S3_* env vars are unprefixed and so are never inlined into client bundles anyway.)
import { randomUUID } from 'node:crypto'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var ${name} for S3 storage`)
  return value
}

function getBucket(): string {
  return requireEnv('S3_BUCKET')
}

function getRegion(): string {
  return requireEnv('S3_REGION')
}

// One client per process (module-level singleton). Lazily created so a missing
// env var surfaces on first use rather than at import time.
let client: S3Client | null = null
function getClient(): S3Client {
  if (client) return client
  client = new S3Client({
    region: getRegion(),
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
    },
  })
  return client
}

/** Public (non-presigned) URL for an object. Only resolves for publicly-readable objects/buckets. */
export function getPublicUrl(key: string): string {
  const base = process.env.S3_PUBLIC_URL_BASE?.replace(/\/+$/, '')
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')
  if (base) return `${base}/${encodedKey}`
  return `https://${getBucket()}.s3.${getRegion()}.amazonaws.com/${encodedKey}`
}

export type UploadResult = {
  /** The S3 object key (store this in your DB). */
  key: string
  /** Public URL (see getPublicUrl caveat). */
  url: string
  /** Object size in bytes. */
  size: number
  contentType: string
}

export type UploadInput = {
  body: Buffer | Uint8Array
  contentType?: string
  /** Original filename — used to derive the extension and a slugged key. */
  fileName?: string
  /** Key prefix / "folder", e.g. 'student-photos'. No leading/trailing slash needed. */
  prefix?: string
  /** Provide to control the exact key. When omitted, a uuid-based key is generated. */
  key?: string
}

function slugifyBaseName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'file'
  )
}

function extensionOf(name: string | undefined): string {
  if (!name) return ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : ''
}

/** Build a collision-resistant key: `[prefix/]<slug>-<uuid><ext>`. */
export function buildObjectKey(input: { fileName?: string; prefix?: string }): string {
  const prefix = input.prefix?.replace(/^\/+|\/+$/g, '')
  const slug = input.fileName ? slugifyBaseName(input.fileName) : 'file'
  const ext = extensionOf(input.fileName)
  const name = `${slug}-${randomUUID()}${ext}`
  return prefix ? `${prefix}/${name}` : name
}

/** Upload bytes to S3. Returns the key + public URL. */
export async function uploadToS3(input: UploadInput): Promise<UploadResult> {
  const key = input.key ?? buildObjectKey({ fileName: input.fileName, prefix: input.prefix })
  const contentType = input.contentType || 'application/octet-stream'
  const body = input.body instanceof Buffer ? input.body : Buffer.from(input.body)
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return { key, url: getPublicUrl(key), size: body.byteLength, contentType }
}

/** Presigned GET URL for private objects. `expiresIn` in seconds (default 15 min). */
export function getPresignedUrl(key: string, expiresIn = 900): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn },
  )
}

/** Delete an object by key. */
export async function deleteFromS3(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }))
}

import { z } from 'zod'

/** Required numeric ID/select fields — avoids Zod 4 "expected number, received undefined". */
export function requiredNumber(message: string) {
  return z.number({ error: message }).min(1, message)
}

/** Optional numeric field with a friendly type error when value is invalid. */
export function optionalNumber(message: string) {
  return z.number({ error: message }).optional()
}

import { z } from 'zod'

/**
 * Common isActive + reason fields shared by every entity schema.
 * Merge into any entity schema with .merge():
 *
 *   const examSessionSchema = z.object({ ... }).merge(baseEntitySchema)
 */
export const baseEntitySchema = z.object({
  isActive: z.boolean(),
  reason: z.string(),
})

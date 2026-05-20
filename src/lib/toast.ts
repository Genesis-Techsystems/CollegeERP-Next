import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/errors'

/**
 * Show a sonner error toast from any thrown value.
 * Extracts a safe user-facing message via getErrorMessage.
 *
 * @param err     - Any caught value (Error, AppError, unknown)
 * @param context - Optional prefix, e.g. 'Failed to load' → "Failed to load: ..."
 */
export function toastError(err: unknown, context?: string): void {
  const msg = getErrorMessage(err)
  toast.error(context ? `${context}: ${msg}` : msg)
}

/**
 * Show a sonner success toast.
 */
export function toastSuccess(message: string): void {
  toast.success(message)
}

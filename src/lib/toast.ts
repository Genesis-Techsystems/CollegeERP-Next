import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

/** API empty-result messages (Angular often returns these with success:false). */
function isNoRecordsFoundMessage(message: string): boolean {
  return /no\s+record(?:\(s\)|s)?/i.test(message);
}

/**
 * Show a sonner error toast from any thrown value.
 * Extracts a safe user-facing message via getErrorMessage.
 * "No Record(s) found" uses the existing info toast (white), not red error.
 *
 * For report Get Report / Get List pages, prefer `useApiQueryToasts` from
 * `@/hooks` so success and error both use toasts (not inline red notices).
 *
 * @param err     - Any caught value (Error, AppError, unknown)
 * @param context - Optional prefix, e.g. 'Failed to load' → "Failed to load: ..."
 */
export function toastError(err: unknown, context?: string): void {
  const msg = getErrorMessage(err);
  if (isNoRecordsFoundMessage(msg)) {
    toast.message(msg);
    return;
  }
  toast.error(context ? `${context}: ${msg}` : msg);
}

/**
 * Show a sonner success toast.
 */
export function toastSuccess(message: string): void {
  toast.success(message);
}

/** Informational toast (Angular Snotify info parity). */
export function toastInfo(message: string): void {
  toast.message(message);
}

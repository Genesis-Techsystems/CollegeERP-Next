"use client";

import { useCallback, useEffect, useRef } from "react";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

type UseApiQueryToastsOptions = {
  /** Stable key for the request that just finished (`null` = idle / not run). */
  requestKey: string | null;
  isFetching: boolean;
  isSuccess?: boolean;
  isError: boolean;
  error: unknown;
  rowCount: number;
  /** When `rowCount > 0`. Default `"Success!"` (Angular Snotify success). */
  successMessage?: string;
  /** When `rowCount === 0`. Default `"No Record(s) found."`. */
  emptyMessage?: string;
};

/**
 * Toast success / empty / error for report-style React Query loads
 * (Get Report / Get List). Prefer this over inline `notice` error text.
 *
 * Call `resetApiToast()` before starting a new request so a retry with the
 * same key still toasts.
 */
export function useApiQueryToasts({
  requestKey,
  isFetching,
  isSuccess,
  isError,
  error,
  rowCount,
  successMessage = "Success!",
  emptyMessage = "No Record(s) found.",
}: UseApiQueryToastsOptions): { resetApiToast: () => void } {
  const toastedKey = useRef<string | null>(null);

  const resetApiToast = useCallback(() => {
    toastedKey.current = null;
  }, []);

  useEffect(() => {
    if (!requestKey || isFetching) return;
    if (toastedKey.current === requestKey) return;
    toastedKey.current = requestKey;

    if (isError) {
      toastError(error);
      return;
    }
    if (!isSuccess) return;
    if (rowCount === 0) {
      toastInfo(emptyMessage);
      return;
    }
  }, [
    requestKey,
    isFetching,
    isSuccess,
    isError,
    error,
    rowCount,
    successMessage,
    emptyMessage,
  ]);

  return { resetApiToast };
}

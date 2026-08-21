"use client";

import { useEffect, useRef } from "react";
import { toastError } from "@/lib/toast";

/** Show API list/load failures as toasts instead of inline red page text. */
export function useLibraryQueryErrorToast(isError: boolean, error: unknown) {
  const lastError = useRef<unknown>(null);

  useEffect(() => {
    if (!isError || error == null) {
      lastError.current = null;
      return;
    }
    if (lastError.current === error) return;
    lastError.current = error;
    toastError(error);
  }, [isError, error]);
}

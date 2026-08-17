"use client";

import { Toaster } from "sonner";

/** Login is outside AppShell, so toasts need their own toaster. */
export function LoginToasts() {
  return <Toaster richColors closeButton position="top-right" />;
}

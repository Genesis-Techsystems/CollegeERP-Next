"use client";

import { createContext, useContext } from "react";

/** Fuse / Angular Material form-field appearance. */
export type FormFieldVariant = "outlined" | "standard";

/**
 * App-wide default is `standard` (Angular mat-form-field underline).
 * Pass `variant="outlined"` or wrap with Provider to override.
 */
export const FormFieldVariantContext = createContext<FormFieldVariant | null>(
  null,
);

export function useFormFieldVariant(
  explicit?: FormFieldVariant,
): FormFieldVariant {
  const fromContext = useContext(FormFieldVariantContext);
  return explicit ?? fromContext ?? "standard";
}

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { z } from "zod";

/** Required numeric ID/select fields — avoids Zod 4 "expected number, received undefined". */
export function requiredNumber(message: string) {
  return z.number({ error: message }).min(1, message);
}

/** Optional numeric field with a friendly type error when value is invalid. */
export function optionalNumber(message: string) {
  return z.number({ error: message }).optional();
}

export function isRequiredLikeMessage(message: string): boolean {
  return /\brequired\b|please select|please fill/i.test(message);
}

/**
 * Puts a backend "X is required" message on the matching field.
 * Returns true when the message is required-related and must not be toasted.
 */
export function applyRequiredFieldError<T extends FieldValues>(
  message: string,
  setError: UseFormSetError<T>,
  labelToField: Record<string, Path<T>>,
): boolean {
  if (!isRequiredLikeMessage(message)) return false;
  const cleaned = message.replace(/\.+$/, "").trim();
  const match = cleaned.match(/^(.+?)\s+is required$/i);
  if (match) {
    const field = labelToField[match[1].trim().toLowerCase()];
    if (field) setError(field, { type: "server", message: cleaned });
  }
  return true;
}

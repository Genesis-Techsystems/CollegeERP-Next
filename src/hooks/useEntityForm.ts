'use client'

/**
 * useEntityForm — eliminates the useState + useForm + useEffect boilerplate
 * that every CRUD modal repeats.
 *
 * Handles:
 * - zodResolver wiring
 * - form reset when modal opens or editData changes
 * - formError state (cleared on open)
 * - isEdit derived flag
 *
 * @example
 * const { register, handleSubmit, isEdit, formError, setFormError } =
 *   useEntityForm(schema, getDefaults, open, editData)
 */

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldValues } from 'react-hook-form'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZodSchema = any

export function useEntityForm<T, V extends FieldValues>(
  schema: AnyZodSchema,
  getDefaults: (entity: T | null) => V,
  open: boolean,
  editData: T | null,
) {
  const [formError, setFormError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<V>({
    resolver: zodResolver(schema) as any,
    defaultValues: getDefaults(editData) as any,
  })

  useEffect(() => {
    if (open) {
      form.reset(getDefaults(editData))
      setFormError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editData])

  return {
    ...form,
    isEdit: editData !== null,
    formError,
    setFormError,
  }
}

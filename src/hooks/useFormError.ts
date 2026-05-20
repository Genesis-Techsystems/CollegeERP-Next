'use client'

/**
 * useFormError — lightweight error state for non-form-level error handling.
 *
 * Provides a string error state, a typed handleError that maps any unknown
 * thrown value to a user-safe message via getErrorMessage, and a clear fn.
 *
 * Note: useEntityForm already embeds formError + setFormError for modal usage.
 * This standalone hook is for cases outside useEntityForm — e.g. a dropdown
 * data fetch useEffect in a modal, or a page-level fetch error.
 *
 * @example
 * const { error, handleError, clear } = useFormError()
 * try { await someOp() } catch (err) { handleError(err) }
 */

import { useState, useCallback } from 'react'
import { getErrorMessage } from '@/lib/errors'

export function useFormError() {
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((err: unknown) => {
    setError(getErrorMessage(err))
  }, [])

  const clear = useCallback(() => setError(null), [])

  return { error, handleError, clear }
}

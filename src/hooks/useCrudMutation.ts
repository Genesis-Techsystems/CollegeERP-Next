'use client'

/**
 * useCrudMutation — wraps useMutation with automatic cache invalidation.
 *
 * Invalidates every key in invalidateKeys on success, then calls the
 * caller-supplied onSuccess. onError is forwarded directly to useMutation.
 *
 * @example
 * const create = useCrudMutation({
 *   mutationFn: createOrganization,
 *   invalidateKeys: [QK.organizations.all],
 *   onSuccess: () => toast.success('Organization created'),
 * })
 * create.mutate(payload)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MutationFunction, QueryKey, MutateOptions } from '@tanstack/react-query'

interface UseCrudMutationOptions<TPayload, TResult = TPayload> {
  mutationFn: MutationFunction<TResult, TPayload>
  /** Query keys to invalidate after a successful mutation */
  invalidateKeys?: QueryKey[]
  onSuccess?: (result: TResult) => void
  onError?: MutateOptions<TResult, Error, TPayload>['onError']
}

export function useCrudMutation<TPayload, TResult = TPayload>({
  mutationFn,
  invalidateKeys,
  onSuccess,
  onError,
}: UseCrudMutationOptions<TPayload, TResult>) {
  const queryClient = useQueryClient()

  return useMutation<TResult, Error, TPayload>({
    mutationFn,
    onSuccess: (result) => {
      invalidateKeys?.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      )
      onSuccess?.(result)
    },
    onError,
  })
}

'use client'

/**
 * useCrudList — standard React Query wrapper for fetching entity lists.
 *
 * Provides:
 * - useQuery with consistent staleTime (defaults to APP_CONFIG.SESSION_STALE_TIME)
 * - data defaults to [] so pages never need to null-check
 * - stable invalidate callback for use after mutations
 *
 * @example
 * const { data, isLoading, invalidate } = useCrudList({
 *   queryKey: QK.organizations.list(),
 *   queryFn: listOrganizations,
 * })
 */

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { APP_CONFIG } from '@/config/constants/app'

interface UseCrudListOptions<T> {
  queryKey: QueryKey
  queryFn: () => Promise<T[]>
  enabled?: boolean
  staleTime?: number
}

export function useCrudList<T>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime,
}: UseCrudListOptions<T>) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime: staleTime ?? APP_CONFIG.SESSION_STALE_TIME,
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, JSON.stringify(queryKey)],
  )

  return {
    ...query,
    data: query.data ?? ([] as T[]),
    invalidate,
  }
}

'use client'

import { useQuery } from '@tanstack/react-query'
import type { SessionUser } from '@/types/user'
import { NEXT_API } from '@/config/constants/api'
import { APP_CONFIG } from '@/config/constants/app'
import { QK } from '@/lib/query-keys'

export function useSession() {
  const { data, isLoading, error, refetch } = useQuery<{ user: SessionUser }>({
    queryKey: QK.session,
    queryFn: async () => {
      const res = await fetch(NEXT_API.AUTH.ME)
      if (!res.ok) throw new Error('Not authenticated')
      return res.json()
    },
    retry: false,
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
  })

  return {
    user: data?.user ?? null,
    isLoading,
    error,
    refetch,
  }
}

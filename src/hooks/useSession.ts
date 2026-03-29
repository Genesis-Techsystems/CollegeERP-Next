'use client'

import { useQuery } from '@tanstack/react-query'
import type { SessionUser } from '@/types/user'

export function useSession() {
  const { data, isLoading, error, refetch } = useQuery<{ user: SessionUser }>({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error('Not authenticated')
      return res.json()
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    user: data?.user ?? null,
    isLoading,
    error,
    refetch,
  }
}

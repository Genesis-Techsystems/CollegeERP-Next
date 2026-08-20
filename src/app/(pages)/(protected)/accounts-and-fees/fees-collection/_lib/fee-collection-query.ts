/** Keep list data when switching browser/app tabs so these pages do not refetch. */
export const FEE_COLLECTION_LIST_QUERY = {
  staleTime: Infinity,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

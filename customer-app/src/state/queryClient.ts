// TanStack Query setup. Mirrors web/src/app/providers.tsx but slimmed down —
// no SSR, no persisted cache, no devtools.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Android users frequently switch apps — keep cached data fresh
      // on focus instead of refetching every time.
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
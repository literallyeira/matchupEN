'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useInit(characterId: number | undefined, enabled: boolean) {
  return useSWR(
    enabled && characterId ? `/api/init?characterId=${characterId}` : null,
    fetcher,
    { dedupingInterval: 10000, revalidateOnFocus: false }
  );
}

export function usePossibleMatches(characterId: number | undefined, enabled: boolean) {
  return useSWR(
    enabled && characterId ? `/api/possible-matches?characterId=${characterId}&limit=20` : null,
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false, revalidateOnReconnect: false }
  );
}

export function useSpotlight(enabled: boolean) {
  return useSWR(
    enabled ? '/api/spotlight' : null,
    fetcher,
    { dedupingInterval: 60000, revalidateOnFocus: false }
  );
}

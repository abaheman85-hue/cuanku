import { liveQuery } from 'dexie';
import { useEffect, useRef, useState, type DependencyList } from 'react';

export interface LiveQueryState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/**
 * Berlangganan hasil query Dexie. Setiap perubahan tabel terkait akan
 * memicu render ulang otomatis tanpa refresh manual.
 */
export function useLiveQuery<T>(
  querier: () => Promise<T>,
  deps: DependencyList,
  initial: T,
): LiveQueryState<T> {
  const querierRef = useRef(querier);

  const [state, setState] = useState<LiveQueryState<T>>({
    data: initial,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    querierRef.current = querier;
    const subscription = liveQuery(() => querierRef.current()).subscribe({
      next: (data) => {
        if (active) setState({ data, loading: false, error: null });
      },
      error: (error: unknown) => {
        if (!active) return;
        setState((previous) => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error.message : 'Gagal memuat data dari perangkat.',
        }));
      },
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

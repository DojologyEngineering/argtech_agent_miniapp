"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribe } from "../db";

interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

/**
 * Minimal data-fetching hook over the service layer. It re-runs whenever the
 * mock store changes, so screens stay in sync after a create/update/delete.
 * Swapping the services for HTTP calls needs no change here.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    loading: true,
    error: null,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const activeRequest = useRef(0);

  const run = useCallback(() => {
    const requestId = ++activeRequest.current;
    setState((prev) => ({ ...prev, loading: true }));
    fetcherRef
      .current()
      .then((data) => {
        if (requestId === activeRequest.current) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (requestId === activeRequest.current) setState({ data: undefined, loading: false, error });
      });
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => subscribe(run), [run]);

  return { ...state, refetch: run };
}

import { useEffect, useState } from 'react';
import { getCollections } from './collectionApi';

export function useCollections(enabled) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ attempt: -1, collections: [], error: null });

  useEffect(() => {
    if (!enabled || state.attempt === attempt) return undefined;

    const controller = new AbortController();
    getCollections(controller.signal)
      .then((collections) => {
        setState({ attempt, collections, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ attempt, collections: [], error });
      });

    return () => controller.abort();
  }, [attempt, enabled, state.attempt]);

  return {
    collections: state.collections,
    loading: enabled && state.attempt !== attempt,
    error: state.error,
    retry: () => setAttempt((current) => current + 1),
  };
}

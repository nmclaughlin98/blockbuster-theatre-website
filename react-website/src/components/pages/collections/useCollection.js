import { useEffect, useState } from 'react';
import { getCollection } from './collectionApi';

export function useCollection(collectionId) {
  const [state, setState] = useState({
    collectionId,
    collection: null,
    movies: [],
    loading: Boolean(collectionId),
    error: null,
  });

  useEffect(() => {
    if (!collectionId) return undefined;

    const controller = new AbortController();

    getCollection(collectionId, controller.signal)
      .then(({ collection, movies }) => {
        setState({ collectionId, collection, movies, loading: false, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ collectionId, collection: null, movies: [], loading: false, error });
      });

    return () => controller.abort();
  }, [collectionId]);

  const stateIsCurrent = state.collectionId === collectionId;
  return {
    collection: stateIsCurrent ? state.collection : null,
    movies: stateIsCurrent ? state.movies : [],
    loading: Boolean(collectionId) && (!stateIsCurrent || state.loading),
    error: stateIsCurrent ? state.error : null,
  };
}

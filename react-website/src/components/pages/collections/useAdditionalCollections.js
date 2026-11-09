import { useEffect, useState } from 'react';
import { getCollection } from './collectionApi.js';

const MAX_ADDITIONAL_COLLECTIONS = 3;

export async function loadAdditionalCollections(collectionIds, signal) {
  const collections = [];
  const errors = [];

  for (const collectionId of collectionIds) {
    if (collections.length === MAX_ADDITIONAL_COLLECTIONS) break;

    try {
      const result = await getCollection(collectionId, signal);
      if (result.collection.isActive !== false) {
        collections.push({ ...result, collectionId });
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Collection ${collectionId} could not be loaded: ${message}`);
    }
  }

  return {
    collections,
    error: errors.length ? new Error(errors.join(' ')) : null,
  };
}

export function useAdditionalCollections(collectionIds) {
  const collectionIdsKey = JSON.stringify(collectionIds);
  const [state, setState] = useState({
    collectionIdsKey: null,
    collections: [],
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    loadAdditionalCollections(collectionIds, controller.signal)
      .then(({ collections, error }) => {
        if (controller.signal.aborted) return;
        setState({ collectionIdsKey, collections, error });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ collectionIdsKey, collections: [], error });
      });

    return () => controller.abort();
  }, [collectionIds, collectionIdsKey]);

  const stateIsCurrent = state.collectionIdsKey === collectionIdsKey;
  return {
    collections: stateIsCurrent ? state.collections : [],
    loading: !stateIsCurrent,
    error: stateIsCurrent ? state.error : null,
  };
}

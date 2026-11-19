import { useEffect, useState } from 'react';
import { getCollection } from './collectionApi.js';

const MAX_ADDITIONAL_COLLECTIONS = 3;

export async function loadAdditionalCollections(collectionIds, signal) {
  const results = await Promise.all(collectionIds.map(async (collectionId) => {
    try {
      return { collectionId, result: await getCollection(collectionId, signal) };
    } catch (error) {
      if (signal?.aborted) throw error;
      return { collectionId, error };
    }
  }));
  const collections = [];

  for (const item of results) {
    if ('error' in item) {
      // Silently ignore collections that cannot be loaded
      continue;
    }

    if (
      item.result.collection.isActive !== false
      && collections.length < MAX_ADDITIONAL_COLLECTIONS
    ) {
      collections.push({ ...item.result, collectionId: item.collectionId });
    }
  }

  return {
    collections,
    error: null,
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

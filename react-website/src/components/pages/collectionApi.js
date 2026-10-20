import { MOVIES_API_URL } from '../../config.js';

export async function getCollections(signal) {
  const response = await fetch(`${MOVIES_API_URL}/collections`, { signal });
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('The collections service returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(data?.message || `Collections request failed (${response.status}).`);
  }

  if (
    !Array.isArray(data?.collections)
    || !data.collections.every((collection) => (
      collection
      && typeof collection === 'object'
      && !Array.isArray(collection)
      && typeof collection.collectionId === 'string'
      && /^\d+$/.test(collection.collectionId)
      && typeof collection.name === 'string'
      && typeof collection.description === 'string'
      && typeof collection.posterUrl === 'string'
      && typeof collection.backdropUrl === 'string'
      && Number.isInteger(collection.movieCount)
      && collection.movieCount >= 0
      && (
        collection.lastUpdated === undefined
        || (
          typeof collection.lastUpdated === 'string'
          && !Number.isNaN(Date.parse(collection.lastUpdated))
        )
      )
    ))
  ) {
    throw new Error('The collections service returned an invalid collection list.');
  }

  return data.collections;
}

export async function getCollection(collectionId, signal) {
  if (!/^\d+$/.test(collectionId)) {
    throw new Error('A numeric collection ID is required.');
  }

  const response = await fetch(
    `${MOVIES_API_URL}/collections/${encodeURIComponent(collectionId)}`,
    { signal },
  );
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('The collections service returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(data?.message || `Collection request failed (${response.status}).`);
  }

  const collection = data?.collection;
  if (
    !collection
    || typeof collection !== 'object'
    || Array.isArray(collection)
    || collection.collectionId == null
    || typeof collection.name !== 'string'
    || typeof collection.description !== 'string'
    || typeof collection.posterUrl !== 'string'
    || typeof collection.backdropUrl !== 'string'
    || (collection.isActive !== undefined && typeof collection.isActive !== 'boolean')
    || !Array.isArray(collection.movieIds)
    || !collection.movieIds.every((id) => typeof id === 'string' && /^\d+$/.test(id))
    || !Array.isArray(data.movies)
    || !data.movies.every((movie) => (
      movie
      && typeof movie === 'object'
      && !Array.isArray(movie)
      && movie.movieId != null
      && typeof movie.title === 'string'
    ))
  ) {
    throw new Error('The collections service returned invalid collection data.');
  }

  return { collection, movies: data.movies };
}

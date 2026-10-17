import { useEffect, useMemo } from 'react';
import { MovieGrid } from '../movies';
import { Layout } from '../shared';
import { PageLoader } from '../shared/PageLoader';
import { CollectionArtwork } from './CollectionArtwork';
import { sortMoviesByReleaseDate } from './collectionSort';
import { useCollection } from './useCollection';

export function CollectionDetail() {
  const collectionId = new URLSearchParams(window.location.search).get('collection') || '';
  const { collection, movies, loading, error } = useCollection(collectionId);
  const orderedMovies = useMemo(() => sortMoviesByReleaseDate(movies), [movies]);

  useEffect(() => {
    document.title = collection ? `${collection.name} - Blockbuster Theatre` : 'Collections - Blockbuster Theatre';
  }, [collection]);

  if (loading) {
    return (
      <Layout current="now" loading>
        <PageLoader label="Loading collection" />
      </Layout>
    );
  }

  return (
    <Layout current="now">
      {!collectionId || error ? (
        <section className="collection-empty-state">
          <div className="collection-content">
            <h1>{collectionId ? 'Collection unavailable' : 'No collection selected'}</h1>
            <p role={error ? 'alert' : undefined}>
              {error?.message || 'Choose a collection from the Collections tab in Now Showing.'}
            </p>
            <a className="button btn-glass" href="./nowShowing.html?view=collections">Back to Collections</a>
          </div>
        </section>
      ) : (
        <>
          <section className="collection-detail-hero" aria-labelledby="collection-title">
            <CollectionArtwork
              collection={collection}
              className="collection-detail-image"
              alt={`${collection.name} collection artwork`}
            />
            <div className="collection-hero-content">
              <p className="collection-eyebrow">Film Collection</p>
              <h1 id="collection-title">{collection.name}</h1>
              {collection.description && <p>{collection.description}</p>}
            </div>
          </section>
          <section className="collection-movies">
            <div className="collection-content">
              <a className="button btn-glass collection-back-button" href="./nowShowing.html?view=collections">
                Back to Collections
              </a>
              <div className="section-header">
                <div>
                  <h2>Films in this collection</h2>
                  <p className="muted">
                    {movies.length} {movies.length === 1 ? 'film' : 'films'} available
                  </p>
                </div>
              </div>
              {movies.length
                ? <MovieGrid movies={orderedMovies} />
                : <p className="collection-message">
                  {collection.movieIds.length
                    ? 'Movies in this collection are not yet available in the catalogue.'
                    : 'This collection does not contain any movies.'}
                </p>}
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}

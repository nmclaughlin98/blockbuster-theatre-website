import styles from './Home.module.css';
import { useEffect } from 'react';
import { Layout } from '../../shared';
import { useMovies } from '../shared/useMovies';
import { HeroCarousel } from './HeroCarousel';
import { HomeSkeleton } from './HomeSkeleton';
import { MovieSection } from './MovieSection';
import { Offers } from './Offers';
import { useAdditionalCollections } from '../collections/useAdditionalCollections';

const ADDITIONAL_COLLECTION_IDS = ['8706566', '8706524'];

export function Home() {
  useEffect(() => {
    document.title = 'Blockbuster Theatre';
  }, []);

  const { movies, loading, error } = useMovies();
  useEffect(() => {
    if (!loading) return undefined;

    document.body.classList.add('home-loading');
    return () => document.body.classList.remove('home-loading');
  }, [loading]);

  const {
    collections: additionalCollections,
    error: additionalCollectionsError,
  } = useAdditionalCollections(ADDITIONAL_COLLECTION_IDS);
  const current = movies.filter((movie) => movie.visible !== false && movie.isComingSoon !== true);
  const carousel = movies.filter((movie) => movie.visible !== false && movie.isCarousel === true);

  if (loading) {
    return (
      <Layout className={styles.root} current="home" loading>
        <HomeSkeleton />
      </Layout>
    );
  }

  return (
    <Layout className={styles.root} current="home">
      <HeroCarousel movies={carousel} />
      {error && <p>Movie listings are temporarily unavailable.</p>}
      {!error && <>
        <MovieSection title="What's On" movies={[...current].sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 7)} />
        <MovieSection title="Top Picks" movies={[...current].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 7)} />
        {additionalCollectionsError && (
          <p role="alert">{additionalCollectionsError.message}</p>
        )}
        {additionalCollections.map(({ collection, collectionId, movies }) => (
          collection.isActive !== false && movies.length > 0 && (
            <MovieSection
              key={collectionId}
              title={collection.name}
              movies={movies}
              viewAllHref={`./collection.html?collection=${encodeURIComponent(collectionId)}`}
              viewAllLabel="View Collection"
            />
          )
        ))}
      </>}
      <Offers />
    </Layout>
  );
}

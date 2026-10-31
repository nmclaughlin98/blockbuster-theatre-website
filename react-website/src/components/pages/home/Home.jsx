import { useEffect } from 'react';
import { Layout } from '../../shared';
import { useMovies } from '../shared/useMovies';
import { HeroCarousel } from './HeroCarousel';
import { HomeSkeleton } from './HomeSkeleton';
import { MovieSection } from './MovieSection';
import { Offers } from './Offers';
import { useCollection } from '../collections/useCollection';

const SEASONAL_PICKS_COLLECTION_ID = '8706566';

export function Home() {
  useEffect(() => {
    document.title = 'Blockbuster Theatre';
  }, []);

  const { movies, loading, error } = useMovies();
  const {
    collection: seasonalCollection,
    movies: seasonalMovies,
    error: seasonalCollectionError,
  } = useCollection(SEASONAL_PICKS_COLLECTION_ID);
  const current = movies.filter((movie) => movie.visible !== false && movie.isComingSoon !== true);
  const carousel = movies.filter((movie) => movie.visible !== false && movie.isCarousel === true);

  if (loading) {
    return (
      <Layout current="home" loading>
        <HomeSkeleton />
      </Layout>
    );
  }

  return (
    <Layout current="home">
      <HeroCarousel movies={carousel} />
      {error && <p>Movie listings are temporarily unavailable.</p>}
      {!error && <>
        <MovieSection title="What's On" movies={[...current].sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 7)} />
        <MovieSection title="Top Picks" movies={[...current].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 7)} />
        {seasonalCollectionError && (
          <p role="alert">Seasonal picks are temporarily unavailable.</p>
        )}
        {seasonalCollection?.isActive === true && seasonalMovies.length > 0 && (
          <MovieSection
            title={seasonalCollection.name}
            movies={seasonalMovies}
            viewAllHref={`./collection.html?collection=${SEASONAL_PICKS_COLLECTION_ID}`}
            viewAllLabel="View Collection"
          />
        )}
      </>}
      <Offers />
    </Layout>
  );
}

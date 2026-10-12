import { Layout } from '../shared';
import { PageLoader } from '../shared/PageLoader';
import { useMovies } from './useMovies';
import { HeroCarousel } from './home/HeroCarousel';
import { MovieSection } from './home/MovieSection';
import { Offers } from './home/Offers';

export function Home() {
  const { movies, loading, error } = useMovies();
  const current = movies.filter((movie) => movie.visible !== false && movie.isComingSoon !== true);
  const carousel = movies.filter((movie) => movie.visible !== false && movie.isCarousel === true);

  if (loading) {
    return (
      <Layout current="home" loading>
        <PageLoader label="Loading home page" />
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
      </>}
      <Offers />
    </Layout>
  );
}

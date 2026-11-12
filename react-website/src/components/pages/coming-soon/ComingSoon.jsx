import { useEffect } from 'react';
import { MovieGrid } from '../../movies';
import { Layout, SectionHeader } from '../../shared';
import { PageLoader } from '../../shared/PageLoader/PageLoader';
import { useMovies } from '../shared/useMovies';

export function ComingSoon() {
  const { movies, loading, error } = useMovies();
  useEffect(() => {
    document.title = 'Blockbuster Theatre - Coming Soon';
  }, []);

  const upcoming = movies
    .filter((movie) => movie.visible !== false && movie.isComingSoon === true)
    .sort((a, b) => new Date(a.countdownTarget || a.releaseDate || 0) - new Date(b.countdownTarget || b.releaseDate || 0));

  if (loading) {
    return (
      <Layout current="coming" loading>
        <PageLoader label="Loading coming soon movies" />
      </Layout>
    );
  }

  return (
    <Layout current="coming">
      <section className="movie-poster">
        <SectionHeader
          title="Coming Soon"
          description="Get a sneak peek at the most anticipated big-screen blockbusters arriving soon."
        />
        {error
          ? <p>Coming soon movies are temporarily unavailable.</p>
          : <MovieGrid movies={upcoming} comingSoon />}
      </section>
    </Layout>
  );
}

import { MovieCard } from './MovieCard';
import { movieId } from './movieId';

export function MovieGrid({ movies, comingSoon = false, containerRef }) {
  if (!movies.length) return <p>{comingSoon ? 'No upcoming movies available.' : 'No movies available for this search.'}</p>;
  return <div className="poster-section" ref={containerRef}>{movies.map((movie) => <MovieCard movie={movie} comingSoon={comingSoon} key={movieId(movie)} />)}</div>;
}

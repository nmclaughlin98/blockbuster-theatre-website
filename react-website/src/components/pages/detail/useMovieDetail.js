import { useEffect, useState } from 'react';
import { movieSlug } from '../../movies/movieId.js';
import {
  getMovieDetail,
  getMovies,
  getShowtimesForDate,
  getWeekdayForDate,
} from '../shared/bookingApi.js';

export async function resolveMovieId(identifier, signal) {
  if (/^\d+$/.test(identifier)) return identifier;

  const movies = await getMovies(signal);
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const movie = movies.find((item) => (
    movieSlug(item).toLowerCase() === normalizedIdentifier
  ));

  return movie?.movieId == null ? null : String(movie.movieId);
}

export function useMovieDetail(identifier, dates = []) {
  const [state, setState] = useState({ movie: null, loading: true, error: null });
  const requestKey = JSON.stringify([identifier, dates]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMovie() {
      try {
        const id = await resolveMovieId(identifier, controller.signal);
        if (!id) {
          setState({ movie: null, loading: false, error: null, requestKey });
          return;
        }

        const movieDates = dates.length ? dates : [undefined];
        const results = await Promise.all(movieDates.map(async (date) => {
          try {
            return await getMovieDetail(id, controller.signal, date);
          } catch (error) {
            if (error.status === 404) return null;
            throw error;
          }
        }));
        const movie = results.find(Boolean);
        if (!movie) {
          setState({ movie: null, loading: false, error: null, requestKey });
          return;
        }

        const showtimes = {};
        movieDates.forEach((date, index) => {
          if (!date) return;
          const weekday = getWeekdayForDate(date);
          showtimes[weekday] = [
            ...(showtimes[weekday] || []),
            ...getShowtimesForDate(results[index]?.showtimes, date),
          ];
        });
        setState({ movie: { ...movie, showtimes }, loading: false, error: null, requestKey });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          movie: null,
          loading: false,
          error: error.status === 404 ? null : error,
          requestKey,
        });
      }
    }

    loadMovie();
    return () => controller.abort();
  }, [identifier, dates, requestKey]);

  return state.requestKey === requestKey
    ? state
    : { movie: null, loading: true, error: null };
}

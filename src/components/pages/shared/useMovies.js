import { useEffect, useState } from 'react';
import { getMovies, getMoviesForDate } from './bookingApi';

export function useMovies(date) {
  const [state, setState] = useState({ movies: [], loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();

    async function loadMovies() {
      try {
        const movies = date
          ? await getMoviesForDate(date, controller.signal)
          : await getMovies(controller.signal);
        setState({ movies, loading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ movies: [], loading: false, error });
      }
    }

    loadMovies();
    return () => controller.abort();
  }, [date]);

  return state;
}

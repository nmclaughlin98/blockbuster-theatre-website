import { useEffect, useState } from 'react';
import { getMovies } from './bookingApi';

export function useMovies() {
  const [state, setState] = useState({ movies: [], loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();

    async function loadMovies() {
      try {
        const movies = await getMovies(controller.signal);
        setState({ movies, loading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ movies: [], loading: false, error });
      }
    }

    loadMovies();
    return () => controller.abort();
  }, []);

  return state;
}

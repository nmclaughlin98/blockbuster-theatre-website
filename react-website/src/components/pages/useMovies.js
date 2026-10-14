import { useEffect, useState } from 'react';
import { MOVIES_API_URL } from '../../config';

export function useMovies() {
  const [state, setState] = useState({ movies: [], loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();

    async function loadMovies() {
      try {
        const response = await fetch(`${MOVIES_API_URL}/movies`, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load movie data');

        const data = await response.json();
        if (!Array.isArray(data.movies)) throw new Error('Invalid movie list response');

        setState({ movies: data.movies, loading: false, error: null });
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

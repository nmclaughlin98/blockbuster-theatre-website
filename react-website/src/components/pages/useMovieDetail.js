import { useEffect, useState } from 'react';
import { MOVIES_API_URL } from '../../config';

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function resolveMovieId(identifier, signal) {
  if (/^\d+$/.test(identifier)) return identifier;

  const response = await fetch(`${MOVIES_API_URL}/movies`, { signal });
  if (!response.ok) throw new Error('Unable to load movie list');

  const data = await response.json();
  if (!Array.isArray(data.movies)) throw new Error('Invalid movie list response');

  const movie = data.movies.find((item) => {
    const slug = item.slug || (typeof item.title === 'string' ? slugify(item.title) : '');
    return slug.toLowerCase() === identifier.toLowerCase();
  });

  return movie?.movieId == null ? null : String(movie.movieId);
}

export function useMovieDetail(identifier) {
  const [state, setState] = useState({ movie: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();

    async function loadMovie() {
      try {
        const id = await resolveMovieId(identifier, controller.signal);
        if (!id) {
          setState({ movie: null, loading: false, error: null });
          return;
        }

        const response = await fetch(
          `${MOVIES_API_URL}/movies/${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );
        if (response.status === 404) {
          setState({ movie: null, loading: false, error: null });
          return;
        }
        if (!response.ok) throw new Error('Unable to load movie details');

        const movie = await response.json();
        if (!movie || typeof movie !== 'object' || Array.isArray(movie)) {
          throw new Error('Invalid movie detail response');
        }

        setState({ movie, loading: false, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ movie: null, loading: false, error });
      }
    }

    loadMovie();
    return () => controller.abort();
  }, [identifier]);

  return state;
}

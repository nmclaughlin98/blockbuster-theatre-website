import { MOVIES_API_URL } from '../../config.js';

async function requestJson(path, options = {}) {
  const response = await fetch(`${MOVIES_API_URL}${path}`, options);
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('The booking service returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(data?.message || `Booking request failed (${response.status}).`);
  }

  return data;
}

export function selectionKey(selection) {
  return `${selection.type}:${selection.id}`;
}

export function selectionDisplayLabel(selection) {
  return selection.type === 'offer' ? `Special offer: ${selection.label}` : selection.label;
}

export function selectionApiId(selection) {
  if (selection.type === 'movie') return selection.movieId;
  if (selection.type === 'offer') return selection.offerId;
  throw new Error('Unsupported film selection type.');
}

export function getSelectionShowtimes(selection, movieDetail, day) {
  const schedule = selection.type === 'offer'
    ? selection.overrideShowtimes
    : movieDetail?.showtimes;

  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) return null;
  return Array.isArray(schedule[day]) ? schedule[day] : [];
}

export async function getFilmSelections(signal) {
  const data = await requestJson('/film-selections', { signal });
  if (!Array.isArray(data.selections)) {
    throw new Error('The booking service returned an invalid film selection list.');
  }

  const validSelections = data.selections.every((selection) => (
    selection
    && (selection.type === 'movie' || selection.type === 'offer')
    && selection.id != null
    && typeof selection.label === 'string'
    && (selection.type === 'movie' ? selection.movieId != null : selection.offerId != null)
  ));
  if (!validSelections) throw new Error('The booking service returned an invalid film selection.');
  return data.selections;
}

export async function getMovies(signal) {
  const movies = [];
  const seenTokens = new Set();
  let nextToken = null;

  do {
    const query = new URLSearchParams();
    if (nextToken) query.set('nextToken', nextToken);
    const suffix = query.size ? `?${query.toString()}` : '';
    const data = await requestJson(`/movies${suffix}`, { signal });
    if (!Array.isArray(data.movies)) {
      throw new Error('The booking service returned an invalid movie list.');
    }
    movies.push(...data.movies);

    if (data.nextToken == null) {
      nextToken = null;
      continue;
    }
    if (typeof data.nextToken !== 'string' || seenTokens.has(data.nextToken)) {
      throw new Error('The booking service returned an invalid movie pagination token.');
    }
    seenTokens.add(data.nextToken);
    nextToken = data.nextToken;
  } while (nextToken);

  return movies;
}

export async function getBookingSelections(signal) {
  try {
    return { selections: await getFilmSelections(signal), error: null };
  } catch (selectionError) {
    if (signal?.aborted) throw selectionError;

    try {
      const movies = await getMovies(signal);
      const selections = movies
        .filter((movie) => movie.visible !== false && movie.isComingSoon !== true && movie.movieId != null)
        .map((movie) => ({
          type: 'movie',
          id: String(movie.movieId),
          movieId: movie.movieId,
          title: movie.title,
          label: movie.title,
          ...(movie.slug ? { slug: movie.slug } : {}),
        }));

      return {
        selections,
        error: `Special offers could not be loaded. Showing available films only. ${selectionError.message}`,
      };
    } catch (movieError) {
      if (signal?.aborted) throw movieError;
      throw new Error(`Unable to load film selections or movies: ${movieError.message}`, { cause: movieError });
    }
  }
}

export async function getMovieDetail(movieId, signal) {
  const data = await requestJson(`/movies/${encodeURIComponent(movieId)}`, { signal });
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The booking service returned invalid movie details.');
  }
  return data;
}

export async function getTicketPricing(selection, day, time, signal) {
  const query = new URLSearchParams();
  query.set(selection.type === 'offer' ? 'offerId' : 'movieId', selectionApiId(selection));
  query.set('day', day);
  query.set('time', time);

  const data = await requestJson(`/ticket-pricing?${query.toString()}`, { signal });
  const ticketTiers = data.ticketTiers || data.pricing?.ticketTiers;
  if (!Array.isArray(ticketTiers)) {
    throw new Error('The booking service returned invalid ticket pricing.');
  }

  return { ...data, ticketTiers };
}

export function createCheckoutPayload(selection, day, time, tickets) {
  const selectedTickets = Object.entries(tickets)
    .filter(([, quantity]) => quantity > 0)
    .map(([tierId, quantity]) => ({ tierId, quantity }));

  return {
    [selection.type === 'offer' ? 'offerId' : 'movieId']: selectionApiId(selection),
    showtime: { day, time },
    tickets: selectedTickets,
  };
}

export async function validateCheckout(payload, signal) {
  const data = await requestJson('/checkout/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (typeof data.total !== 'number' || !Number.isFinite(data.total)) {
    throw new Error('The booking service returned an invalid checkout total.');
  }
  return data;
}

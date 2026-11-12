import { useEffect, useState } from 'react';
import { useNetworkSpeed } from '../../../utils/useNetworkSpeed';
import { getFilmSelections } from '../shared/bookingApi';
import { useMovies } from '../shared/useMovies';
import { SectionHeader } from '../../shared';
import { OfferCard } from './OfferCard';

export function Offers() {
  const { movies } = useMovies();
  const isSlowConnection = useNetworkSpeed();
  const [state, setState] = useState({ offers: [], loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    getFilmSelections(controller.signal)
      .then((selections) => {
        setState({
          offers: selections.filter((selection) => selection.type === 'offer'),
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ offers: [], loading: false, error: error.message });
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="offers">
      <SectionHeader title="Special Offers" />
      {state.loading && <p role="status">Loading special offers...</p>}
      {state.error && <p className="form-notice" role="alert">{state.error}</p>}
      {!state.loading && !state.error && !state.offers.length
        && <p>No special offers are currently available.</p>}
      <div className="offers-grid">
        {state.offers.map((offer) => {
          const featuredMovie = movies.find((movie) => (
            String(movie.movieId) === String(offer.featuredMovieId)
          ));
          return (
            <OfferCard
              key={`${offer.type}:${offer.id}`}
              offer={offer}
              featuredMovie={featuredMovie}
              isSlowConnection={isSlowConnection}
            />
          );
        })}
      </div>
    </section>
  );
}

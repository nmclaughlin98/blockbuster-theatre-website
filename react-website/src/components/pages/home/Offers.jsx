import { useEffect, useState } from 'react';
import { useNetworkSpeed } from '../../../utils/useNetworkSpeed';
import { getFilmSelections } from '../shared/bookingApi';
import { SectionHeader } from '../../shared';
import { OfferCard } from './OfferCard';

export function Offers({ movies = [] }) {
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

  const visibleOffers = state.offers.flatMap((offer) => {
    const featuredMovie = movies.find((movie) => (
      movie.visible === true
      && String(movie.movieId) === String(offer.featuredMovieId)
    ));
    return featuredMovie ? [{ offer, featuredMovie }] : [];
  });

  if (state.loading) return null;
  if (state.error) return <p className="form-notice" role="alert">{state.error}</p>;
  if (!visibleOffers.length) return null;

  return (
    <section className="offers">
      <SectionHeader title="Special Offers" />
      <div className="offers-grid">
        {visibleOffers.map(({ offer, featuredMovie }) => {
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

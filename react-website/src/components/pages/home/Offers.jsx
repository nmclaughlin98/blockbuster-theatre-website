import { useEffect, useState } from 'react';
import { asset } from '../../shared';
import { getPosterSrc, getPosterSrcSet } from '../../../utils/posterImages';
import { useNetworkSpeed } from '../../../utils/useNetworkSpeed';
import { getFilmSelections } from '../bookingApi';
import { useMovies } from '../useMovies';

export function Offers() {
  const { movies } = useMovies();
  const isSlowConnection = useNetworkSpeed();
  const [state, setState] = useState({ offers: [], loading: true, error: null });
  const [failedPosterIds, setFailedPosterIds] = useState(() => new Set());
  const fallbackPoster = asset('assets/images/logo/png/logo-full.png');

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
      <div className="section-header"><h1>Special Cinema Offers</h1></div>
      {state.loading && <p role="status">Loading special offers...</p>}
      {state.error && <p className="form-notice" role="alert">{state.error}</p>}
      {!state.loading && !state.error && !state.offers.length
        && <p>No special offers are currently available.</p>}
      <div className="offers-grid">
        {state.offers.map((offer) => {
          const featuredMovie = movies.find((movie) => (
            String(movie.movieId) === String(offer.featuredMovieId)
          ));
          const imageFailed = failedPosterIds.has(String(offer.id));
          const displayLabel = offer.displayLabel ?? offer.title;
          return (
            <div className="col" key={`${offer.type}:${offer.id}`}>
              {featuredMovie?.poster && (
                <img
                  className="poster icon"
                  src={imageFailed
                    ? fallbackPoster
                    : getPosterSrc(featuredMovie.poster, isSlowConnection)}
                  srcSet={!imageFailed
                    ? getPosterSrcSet(featuredMovie.poster, isSlowConnection)
                    : undefined}
                  sizes="140px"
                  alt={`${displayLabel} featuring ${featuredMovie.title}`}
                  onError={() => setFailedPosterIds((previous) => {
                    const offerId = String(offer.id);
                    return previous.has(offerId) ? previous : new Set(previous).add(offerId);
                  })}
                />
              )}
              <h2>{displayLabel}</h2>
              {featuredMovie && <p className="featured-movie">Featuring: {featuredMovie.title}</p>}
              {offer.tagline && <p>{offer.tagline}</p>}
              {offer.priceDescription && <p>{offer.priceDescription}</p>}
              <a className="button" href={`./bookNow.html?offerId=${encodeURIComponent(offer.offerId)}`}>
                {offer.ctaLabel ?? 'Claim Offer'}
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}

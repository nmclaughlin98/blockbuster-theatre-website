import { useEffect, useState } from 'react';
import { getFilmSelections } from '../bookingApi';
import { useMovies } from '../useMovies';

export function Offers() {
  const { movies } = useMovies();
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
          return (
            <div className="col" key={`${offer.type}:${offer.id}`}>
              {featuredMovie?.poster && (
                <img
                  className="poster icon"
                  src={featuredMovie.poster}
                  alt={`${offer.title} featuring ${featuredMovie.title}`}
                />
              )}
              <h2>{offer.title}</h2>
              {offer.label && offer.label !== offer.title && <p>{offer.label}</p>}
              {featuredMovie && <p>Featuring: {featuredMovie.title}</p>}
              <a className="button" href={`./bookNow.html?offerId=${encodeURIComponent(offer.offerId)}`}>
                Claim Offer
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}

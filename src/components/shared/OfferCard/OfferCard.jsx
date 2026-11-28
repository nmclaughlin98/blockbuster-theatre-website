import { useState } from 'react';
import { Link } from 'react-router-dom';
import { asset } from '..';
import { getPosterSrc, getPosterSrcSet } from '../../../utils/posterImages';
import styles from './OfferCard.module.css';

export function OfferCard({ offer, featuredMovie, isSlowConnection }) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackPoster = asset('assets/images/logo/png/logo-full.png');
  const displayLabel = offer.displayLabel ?? offer.title;

  return (
    <Link
      className={styles.card}
      to={`/book-now?offerId=${encodeURIComponent(offer.offerId)}`}
    >
      {featuredMovie?.poster && (
        <img
          className={styles.poster}
          src={imageFailed
            ? fallbackPoster
            : getPosterSrc(featuredMovie.poster, isSlowConnection)}
          srcSet={!imageFailed
            ? getPosterSrcSet(featuredMovie.poster, isSlowConnection)
            : undefined}
          sizes="(min-width: 768px) 150px, 100px"
          alt={`${displayLabel} featuring ${featuredMovie.title}`}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className={styles.details}>
        <h2 className={styles.title}>{displayLabel}</h2>
        {featuredMovie && (
          <p className={`${styles.description} ${styles.featuredMovie}`}>
            Featuring: {featuredMovie.title}
          </p>
        )}
        {offer.tagline && <p className={styles.description}>{offer.tagline}</p>}
        {offer.priceDescription && <p className={styles.description}>{offer.priceDescription}</p>}
      </div>
      <span className={styles.chevron} aria-hidden="true">›</span>
    </Link>
  );
}

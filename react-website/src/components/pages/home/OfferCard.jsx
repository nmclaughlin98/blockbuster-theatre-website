import { useState } from 'react';
import { asset } from '../../shared';
import { getPosterSrc, getPosterSrcSet } from '../../../utils/posterImages';
import styles from './OfferCard.module.css';

export function OfferCard({ offer, featuredMovie, isSlowConnection }) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackPoster = asset('assets/images/logo/png/logo-full.png');
  const displayLabel = offer.displayLabel ?? offer.title;

  return (
    <div className={styles.card}>
      {featuredMovie?.poster && (
        <img
          className={styles.poster}
          src={imageFailed
            ? fallbackPoster
            : getPosterSrc(featuredMovie.poster, isSlowConnection)}
          srcSet={!imageFailed
            ? getPosterSrcSet(featuredMovie.poster, isSlowConnection)
            : undefined}
          sizes="140px"
          alt={`${displayLabel} featuring ${featuredMovie.title}`}
          onError={() => setImageFailed(true)}
        />
      )}
      <h2 className={styles.title}>{displayLabel}</h2>
      {featuredMovie && (
        <p className={`${styles.description} ${styles.featuredMovie}`}>
          Featuring: {featuredMovie.title}
        </p>
      )}
      {offer.tagline && <p className={styles.description}>{offer.tagline}</p>}
      {offer.priceDescription && <p className={styles.description}>{offer.priceDescription}</p>}
      <a
        className={`button ${styles.button}`}
        href={`./bookNow.html?offerId=${encodeURIComponent(offer.offerId)}`}
      >
        {offer.ctaLabel ?? 'Claim Offer'}
      </a>
    </div>
  );
}

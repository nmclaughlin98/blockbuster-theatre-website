import { useState } from 'react';
import { asset } from '../shared';
import { getPosterSrc, getPosterSrcSet } from '../../utils/posterImages';
import { useNetworkSpeed } from '../../utils/useNetworkSpeed';
import { Countdown } from './Countdown';
import { movieSlug } from './movieId';
import styles from './MovieCard.module.css';

export function MovieCard({ movie, comingSoon = false }) {
    const fallbackPoster = asset('assets/images/logo/png/logo-full.png');
    const [imageFailed, setImageFailed] = useState(false);
    const isSlowConnection = useNetworkSpeed();

    const hasValidPoster = !imageFailed && movie.poster;
    const posterSrc = getPosterSrc(movie.poster, isSlowConnection) || fallbackPoster;

    return (
        <div className={styles.posterCardContainer}>
            <a
                className={styles.posterColumn}
                href={`./${comingSoon ? 'movie-detail-coming-soon' : 'movie-detail'}.html?movie=${encodeURIComponent(movieSlug(movie))}`}
                aria-label={`View details for ${movie.title}`}
            >
                <img
                    className={styles.poster}
                    src={imageFailed ? fallbackPoster : posterSrc}
                    srcSet={hasValidPoster ? getPosterSrcSet(movie.poster, isSlowConnection) : undefined}
                    sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    alt={movie.title}
                    onError={() => setImageFailed(true)}
                />
                <div className={styles.overlay}>
                    <div className={styles.overlayText}>{movie.title}</div>
                    {comingSoon ? <Countdown movie={movie} /> : <div className={styles.runtime}>{movie.runtime || 0} mins</div>}
                </div>
            </a>
        </div>
    );
}

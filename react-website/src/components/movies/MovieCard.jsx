import { useState } from 'react';
import { asset } from '../shared';
import { getPosterSrc, getPosterSrcSet } from '../../utils/posterImages';
import { useNetworkSpeed } from '../../utils/useNetworkSpeed';
import { Countdown } from './Countdown';
import { movieSlug } from './movieId';

export function MovieCard({ movie, comingSoon = false }) {
    const fallbackPoster = asset('assets/images/logo/png/logo-full.png');
    const [imageFailed, setImageFailed] = useState(false);
    const isSlowConnection = useNetworkSpeed();

    const hasValidPoster = !imageFailed && movie.poster;
    const posterSrc = getPosterSrc(movie.poster, isSlowConnection) || fallbackPoster;

    return (
        <div className="poster-card-container">
            <a
                className="poster-column"
                href={`./${comingSoon ? 'movie-detail-coming-soon' : 'movie-detail'}.html?movie=${encodeURIComponent(movieSlug(movie))}`}
                aria-label={`View details for ${movie.title}`}
            >
                <img
                    className="poster"
                    src={imageFailed ? fallbackPoster : posterSrc}
                    srcSet={hasValidPoster ? getPosterSrcSet(movie.poster, isSlowConnection) : undefined}
                    sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    alt={movie.title}
                    onError={() => setImageFailed(true)}
                />
                <div className="overlay">
                    <div className="overlay-text">{movie.title}</div>
                    {comingSoon ? <Countdown movie={movie} /> : <div className="runtime">{movie.runtime || 0} mins</div>}
                </div>
            </a>
        </div>
    );
}

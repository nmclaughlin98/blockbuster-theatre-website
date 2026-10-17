import { useState } from 'react';
import { asset } from '../shared';
import { Countdown } from './Countdown';
import { movieId } from './movieId';

const buildPosterSrcSet = (posterUrl) => {
    if (!posterUrl || !posterUrl.includes('image.tmdb.org')) return undefined;

    return [
        `${posterUrl.replace('/original/', '/w185/')} 185w`,
        `${posterUrl.replace('/original/', '/w342/')} 342w`,
        `${posterUrl.replace('/original/', '/w500/')} 500w`,
        `${posterUrl.replace('/original/', '/w780/')} 780w`,
    ].join(', ');
};

export function MovieCard({ movie, comingSoon = false }) {
    const fallbackPoster = asset('assets/images/logo/png/logo-full.png');
    const [imageFailed, setImageFailed] = useState(false);

    const hasValidPoster = !imageFailed && movie.poster;

    return (
        <div className="poster-card-container">
            <a
                className="poster-column"
                href={`./${comingSoon ? 'movie-detail-coming-soon' : 'movie-detail'}.html?movie=${movieId(movie)}`}
                aria-label={`View details for ${movie.title}`}
            >
                <img
                    className="poster"
                    src={imageFailed ? fallbackPoster : movie.poster || fallbackPoster}
                    srcSet={hasValidPoster ? buildPosterSrcSet(movie.poster) : undefined}
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

import { useEffect, useRef, useState } from 'react';
import { movieId, movieSlug } from '../../movies';
import { DirectionalButton } from '../../shared';

function withAutoplay(url) {
    if (/[?&]autoplay=1(?:&|$)/.test(url)) return url;
    const hashIndex = url.indexOf('#');
    const urlWithoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
    return `${urlWithoutHash}${urlWithoutHash.includes('?') ? '&' : '?'}autoplay=1${hash}`;
}

export function HeroCarousel({ movies }) {
    const [index, setIndex] = useState(0);
    const [previousIndex, setPreviousIndex] = useState(null);
    const [slideDirection, setSlideDirection] = useState('right');
    const [isPaused, setIsPaused] = useState(false);
    const [trailerUrl, setTrailerUrl] = useState('');
    const [isReady, setIsReady] = useState(false);
    const swipeStart = useRef(null);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setIsReady(true));
        return () => window.cancelAnimationFrame(frame);
    }, []);

    function handleBlurClick(e, action) {
        e.currentTarget.blur();
        if (action) action();
    }

    function changeSlide(nextIndex, direction) {
        if (nextIndex === index) return;
        setPreviousIndex(index);
        setSlideDirection(direction);
        setIndex(nextIndex);
    }

    function handleSwipeStart(event) {
        if (
            event.pointerType !== 'touch'
            || (event.target instanceof Element && event.target.closest('a, button'))
        ) return;
        swipeStart.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function handleSwipeEnd(event) {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (!start || event.pointerType !== 'touch') return;

        const deltaX = event.clientX - start.x;
        const deltaY = event.clientY - start.y;
        if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

        const direction = deltaX < 0 ? 'right' : 'left';
        const nextIndex = deltaX < 0
            ? (index + 1) % movies.length
            : (index - 1 + movies.length) % movies.length;
        changeSlide(nextIndex, direction);
    }

    useEffect(() => {
        if (!movies.length || isPaused || trailerUrl) return undefined;
        const timer = setInterval(() => changeSlide((index + 1) % movies.length, 'right'), 6000);
        return () => clearInterval(timer);
    }, [movies.length, index, isPaused, trailerUrl]);

    useEffect(() => {
        if (!trailerUrl) return undefined;

        function closeOnEscape(event) {
            if (event.key === 'Escape') setTrailerUrl('');
        }

        document.body.classList.add('noScroll');
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.classList.remove('noScroll');
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [trailerUrl]);

    if (!movies.length) return null;
    const trailerEmbedUrl = trailerUrl ? withAutoplay(trailerUrl) : '';

    return (
        <>
            <div
                id="picturecarousel"
                className="carousel slide"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                <ol className="carousel-indicators">
                    {movies.map((item, itemIndex) => (
                        <li
                            key={movieId(item)}
                            className={itemIndex === index ? 'active' : ''}
                            onClick={(e) => handleBlurClick(e, () => changeSlide(itemIndex, itemIndex > index ? 'right' : 'left'))}
                        />
                    ))}
                </ol>
                <div
                    className={`carousel-inner${isReady ? ' is-ready' : ''}`}
                    role="listbox"
                    onPointerDown={handleSwipeStart}
                    onPointerUp={handleSwipeEnd}
                    onPointerCancel={() => { swipeStart.current = null; }}
                >
                    {movies.map((movie, itemIndex) => (
                        <div
                            key={movieId(movie)}
                            className={[
                                'item',
                                itemIndex === index && 'active',
                                previousIndex !== null && itemIndex === index && `slide-in-${slideDirection}`,
                                previousIndex !== null && itemIndex === previousIndex && `slide-out-${slideDirection === 'right' ? 'left' : 'right'}`,
                            ].filter(Boolean).join(' ')}
                            aria-hidden={itemIndex !== index}
                        >
                            <img src={movie.largeStill || movie.still || movie.poster} alt={movie.title} />
                            <div className="hero-caption">
                                <h2>{movie.title}</h2>
                                <p>{movie.tagline}</p>
                                <div className="hero-actions">
                                    <a
                                        className="button"
                                        href={`./bookNow.html?movie=${encodeURIComponent(movieSlug(movie))}`}
                                        onClick={(e) => e.currentTarget.blur()}
                                    >
                                        Book Tickets
                                    </a>
                                    {movie.trailer && (
                                        <button
                                            type="button"
                                            className="button btn-secondary"
                                            onClick={(e) => handleBlurClick(e, () => setTrailerUrl(movie.trailer))}
                                        >
                                            Watch Trailer
                                        </button>
                                    )}
                                    <a
                                        className="button btn-glass"
                                        href={`./templates/movie-detail.html?movie=${encodeURIComponent(movieSlug(movie))}`}
                                        onClick={(e) => e.currentTarget.blur()}
                                    >
                                        More Info
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <DirectionalButton
                    className="carousel-control left"
                    direction="previous"
                    iconOnly
                    aria-label="Previous slide"
                    onClick={(e) => handleBlurClick(e, () => changeSlide((index - 1 + movies.length) % movies.length, 'left'))}
                />
                <DirectionalButton
                    className="carousel-control right"
                    direction="next"
                    iconOnly
                    aria-label="Next slide"
                    onClick={(e) => handleBlurClick(e, () => changeSlide((index + 1) % movies.length, 'right'))}
                />
            </div>
            <div
                id="trailer-modal"
                className={`modal-backdrop ${trailerUrl ? 'open' : ''}`}
                aria-hidden={!trailerUrl}
                inert={!trailerUrl ? '' : undefined}
                onClick={(event) => {
                    if (event.target === event.currentTarget) setTrailerUrl('');
                }}
            >
                <div className="modal-dialog" role="dialog" aria-modal="true" aria-label="Movie trailer">
                    <button
                        type="button"
                        className="modal-close-btn"
                        aria-label="Close trailer"
                        onClick={(e) => handleBlurClick(e, () => setTrailerUrl(''))}
                    >
                        &times;
                    </button>
                    <iframe
                        id="trailer-iframe"
                        src={trailerEmbedUrl || null}
                        title="Movie trailer"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            </div>
        </>
    );
}

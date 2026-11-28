import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { movieId, movieSlug } from '../../components/movies';
import { DirectionalButton, TrailerModal } from '../../components/shared';
import styles from './HeroCarousel.module.css';

const canHover = () =>
    typeof window !== 'undefined'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function HeroCarousel({ movies }) {
    const [index, setIndex] = useState(0);
    const [previousIndex, setPreviousIndex] = useState(null);
    const [slideDirection, setSlideDirection] = useState('right');
    const [isHoverPaused, setIsHoverPaused] = useState(false);
    const [isTouchPaused, setIsTouchPaused] = useState(false);
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

    const changeSlide = useCallback((nextIndex, direction) => {
        if (nextIndex === index) return;
        setPreviousIndex(index);
        setSlideDirection(direction);
        setIndex(nextIndex);
        setIsTouchPaused(false);
    }, [index]);

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

        // Clean tap (no swipe) toggles pause on touch devices
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            setIsTouchPaused((prev) => !prev);
            return;
        }

        if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

        const direction = deltaX < 0 ? 'right' : 'left';
        const nextIndex = deltaX < 0
            ? (index + 1) % movies.length
            : (index - 1 + movies.length) % movies.length;
        changeSlide(nextIndex, direction);
    }

    if (!movies.length) return null;

    const activeMovie = movies[index];
    const paused = isHoverPaused || isTouchPaused || Boolean(trailerUrl);

    return (
        <>
            <div
                id="picturecarousel"
                className={styles.carousel}
            >
                <ol className={styles.indicators}>
                    {movies.map((item, itemIndex) => {
                        const isActive = itemIndex === index;
                        return (
                            <li
                                key={movieId(item)}
                                className={[
                                    isActive && styles.activeIndicator,
                                    isActive && paused && styles.pausedIndicator,
                                ].filter(Boolean).join(' ')}
                                onClick={(e) => handleBlurClick(e, () => changeSlide(itemIndex, itemIndex > index ? 'right' : 'left'))}
                                onAnimationEnd={() => {
                                    if (isActive) {
                                        changeSlide((index + 1) % movies.length, 'right');
                                    }
                                }}
                            />
                        );
                    })}
                </ol>
                <div
                    className={`${styles.inner}${isReady ? ` ${styles.isReady}` : ''}`}
                    role="listbox"
                    onMouseEnter={() => { if (canHover()) setIsHoverPaused(true); }}
                    onMouseLeave={() => { if (canHover()) setIsHoverPaused(false); }}
                    onPointerDown={handleSwipeStart}
                    onPointerUp={handleSwipeEnd}
                    onPointerCancel={() => { swipeStart.current = null; }}
                >
                    {movies.map((movie, itemIndex) => {
                        const slideInClass = slideDirection === 'right' ? styles.slideInRight : styles.slideInLeft;
                        const slideOutClass = slideDirection === 'right' ? styles.slideOutLeft : styles.slideOutRight;

                        return (
                            <div
                                key={movieId(movie)}
                                className={[
                                    styles.item,
                                    itemIndex === index && styles.active,
                                    previousIndex !== null && itemIndex === index && slideInClass,
                                    previousIndex !== null && itemIndex === previousIndex && slideOutClass,
                                ].filter(Boolean).join(' ')}
                                aria-hidden={itemIndex !== index}
                            >
                                <img src={movie.largeStill || movie.still || movie.poster} alt={movie.title} />
                            </div>
                        );
                    })}
                    <div className={styles.overlay} aria-hidden="true" />
                    {activeMovie && (
                        <div key={movieId(activeMovie)} className={styles.caption}>
                            <h2>{activeMovie.title}</h2>
                            <p>{activeMovie.tagline}</p>
                            <div className={styles.actions}>
                                <Link
                                    className="button"
                                    to={`/book-now?movie=${encodeURIComponent(movieSlug(activeMovie))}`}
                                    onClick={(e) => e.currentTarget.blur()}
                                >
                                    Book Tickets
                                </Link>
                                {activeMovie.trailer && (
                                    <button
                                        type="button"
                                        className={`button ${styles.btnSecondary}`}
                                        onClick={(e) => handleBlurClick(e, () => setTrailerUrl(activeMovie.trailer))}
                                    >
                                        Watch Trailer
                                    </button>
                                )}
                                <Link
                                    className="button btn-glass"
                                    to={`/movie/${encodeURIComponent(movieSlug(activeMovie))}`}
                                    onClick={(e) => e.currentTarget.blur()}
                                >
                                    More Info
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
                <DirectionalButton
                    className={`${styles.control} ${styles.controlLeft}`}
                    direction="previous"
                    iconOnly
                    aria-label="Previous slide"
                    onClick={(e) => handleBlurClick(e, () => changeSlide((index - 1 + movies.length) % movies.length, 'left'))}
                />
                <DirectionalButton
                    className={`${styles.control} ${styles.controlRight}`}
                    direction="next"
                    iconOnly
                    aria-label="Next slide"
                    onClick={(e) => handleBlurClick(e, () => changeSlide((index + 1) % movies.length, 'right'))}
                />
            </div>
            <TrailerModal url={trailerUrl} onClose={() => setTrailerUrl('')} />
        </>
    );
}

import styles from './Timetable.module.css';
import { useEffect, useMemo, useState } from 'react';
import { movieId, movieSlug } from '../../movies';
import { CenteredHeadingBlock, Layout, ShowtimeChip } from '../../shared';
import {
    getMoviesForDates,
    getUpcomingScreeningDates,
    getWeekdayForDate,
    isShowtimeIdForDate,
} from '../shared/bookingApi';
import { createBookingHref } from '../shared/showtimeNavigation';
import { useMovies } from '../shared/useMovies';
import { openTimetablePdf } from './timetablePdf';
import { TimetableSkeleton } from './TimetableSkeleton';

const maxShowtimeButtons = 4;

function getMovieTitle(movie) {
    return typeof movie.title === 'string' && movie.title.trim() ? movie.title : 'Untitled movie';
}

function getMovieGenre(movie) {
    if (Array.isArray(movie.genres) && movie.genres.length)
        return movie.genres.slice(0, 3).join(' / ');
    return movie.genre || 'General';
}

function getShowtimes(movie, day) {
    const schedule = movie.showtimes;
    if (!schedule || typeof schedule !== 'object') return [];
    const slots = Array.isArray(schedule)
        ? schedule
        : Object.values(schedule).filter(Array.isArray).flat();

    return slots.filter((slot) => (
        isShowtimeIdForDate(slot?.showtimeId, slot?.date)
        && getWeekdayForDate(slot.date) === day
    ));
}

function getWeekCommencing() {
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return monday.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function TimetableControls({ days, day, search, onDayChange, onSearch, onDownload, downloadMessage, downloadError, disabled, downloading }) {
    return (
        <div className="timetable-controls">
            <div className="day-tabs" role="tablist" aria-label="Showtimes by day">
                {days.map((item) => (
                    <button
                        className={`day-tab ${day === item ? 'active' : ''}`}
                        key={item}
                        id={`timetable-tab-${item.toLowerCase()}`}
                        type="button"
                        role="tab"
                        aria-selected={day === item}
                        aria-controls="timetable-panel"
                        onClick={() => onDayChange(item)}
                    >
                        {item}
                    </button>
                ))}
            </div>
            <div className="timetable-toolbar">
                <div className="filter-bar">
                    <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="5" />
                        <path d="m16 16 4 4" />
                    </svg>
                    <label htmlFor="movie-search-input">Search by movie title:</label>
                    <input
                        id="movie-search-input"
                        className="search-input"
                        type="search"
                        aria-label="Search film title"
                        value={search}
                        onChange={(event) => onSearch(event.target.value)}
                        placeholder="Enter a movie title..."
                    />
                </div>
                <button className="button btn-glass print-pdf-btn" type="button" onClick={onDownload}
                    disabled={disabled}>
                    {downloading ? 'Preparing...' : 'View Timetable PDF'}
                    <span className="material-symbols-outlined">download</span>
                </button>
                {downloadMessage &&
                    <span
                        className={`timetable-download-status ${downloadError ? 'error' : ''}`}
                        role={downloadError ? 'alert' : 'status'}
                    >
                        {downloadMessage}
                    </span>}
            </div>
        </div>
    );
}

function TimetableMovie({ movie, day }) {
    const times = getShowtimes(movie, day).slice(0, maxShowtimeButtons);
    if (!times.length) return null;

    return (
        <div className="movie-card">
            <div className="movie-info">
                <a
                    className="movie-title"
                    href={`./movie-detail.html?movie=${encodeURIComponent(movieSlug(movie))}`}
                >
                    {getMovieTitle(movie)}
                </a>
                <div className="movie-meta">
                    <span className="badge-genre">{getMovieGenre(movie)}</span>
                </div>
            </div>
            <div className="showtimes-grid">
                {times.map((slot) => (
                    <ShowtimeChip
                        className="timetable-showtime-chip"
                        href={createBookingHref(
                            './bookNow.html',
                            movieSlug(movie) || getMovieTitle(movie),
                            slot.date,
                            slot,
                        )}
                        key={slot.showtimeId}
                        time={slot.time}
                        screen={slot.screen}
                    />
                ))}
            </div>
        </div>
    );
}

export function Timetable() {
    useEffect(() => {
        document.title = 'Blockbuster Theatre - Timetable';
    }, []);

    const screeningDates = useMemo(() => getUpcomingScreeningDates(), []);
    const days = screeningDates.slice(0, -1).map(getWeekdayForDate);
    const [day, setDay] = useState(days[0]);
    const screeningDate = screeningDates.find((date) => getWeekdayForDate(date) === day);
    const { movies, loading, error } = useMovies(screeningDate);
    const [search, setSearch] = useState('');
    const [downloadMessage, setDownloadMessage] = useState('');
    const [downloadError, setDownloadError] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const filteredMovies = movies
        .filter((movie) => (
            movie.visible !== false
            && movie.isComingSoon !== true
            && getMovieTitle(movie).toLowerCase().includes(search.trim().toLowerCase())
            && getShowtimes(movie, day).length > 0
        ))
        .sort((a, b) => getMovieTitle(a).localeCompare(getMovieTitle(b), undefined, { sensitivity: 'base' }));
    const weekCommencing = getWeekCommencing();

    if (loading) {
        return (
            <Layout className={styles.root} current="now" loading>
                <TimetableSkeleton />
            </Layout>
        );
    }

    async function handleDownload() {
        const previewWindow = window.open('', '_blank');
        if (!previewWindow) {
            setDownloadMessage('Unable to open the timetable PDF. Please allow pop-ups and try again.');
            setDownloadError(true);
            return;
        }

        previewWindow.opener = null;
        previewWindow.document.title = 'Preparing timetable PDF';
        previewWindow.document.body.textContent = 'Preparing timetable PDF...';
        setDownloading(true);
        setDownloadError(false);
        setDownloadMessage('Preparing...');
        try {
            const printableMovies = await getMoviesForDates(screeningDates);
            await openTimetablePdf(printableMovies, weekCommencing, previewWindow);
            setDownloadMessage('Your timetable PDF opened in a new tab.');
        } catch (downloadError) {
            previewWindow?.close();
            setDownloadError(true);
            setDownloadMessage(downloadError instanceof Error
                ? `Unable to open timetable PDF: ${downloadError.message}`
                : 'Unable to open timetable PDF.');
        } finally {
            setDownloading(false);
        }
    }

    return (
        <Layout className={styles.root} current="now">
            <section id="timetablePrintArea">
                <CenteredHeadingBlock
                    className="timetable-banner"
                    title="Weekly Movie Timetable"
                    description={`Schedule for Week Commencing ${weekCommencing}`}
                    descriptionId="weekCommencingLabel"
                />
                <TimetableControls
                    days={days}
                    day={day}
                    search={search}
                    onDayChange={setDay}
                    onSearch={setSearch}
                    onDownload={handleDownload}
                    downloadMessage={downloadMessage}
                    downloadError={downloadError}
                    disabled={Boolean(error) || downloading}
                    downloading={downloading}
                />
                <div
                    className="timetable-container"
                    id="timetable-panel"
                    role="tabpanel"
                    aria-labelledby={`timetable-tab-${day.toLowerCase()}`}
                    aria-live="polite"
                >
                    {error
                        ? <p>Movie timetable is temporarily unavailable.</p>
                        : filteredMovies.length
                            ? filteredMovies.map((movie) => <TimetableMovie movie={movie} day={day}
                                key={movieId(movie)} />)
                            : <p>No movies available for this search and day.</p>}
            </div>
            </section>
        </Layout>
    );
}

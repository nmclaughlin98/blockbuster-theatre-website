import { useEffect, useMemo, useState } from 'react';
import { movieId, movieSlug } from '../../movies';
import { Layout } from '../../shared';
import { PageLoader } from '../../shared/PageLoader';
import { getUpcomingScreeningDates, getWeekdayForDate, isShowtimeIdForDate } from '../shared/bookingApi';
import { createBookingHref } from '../shared/showtimeNavigation';
import { useMovies } from '../shared/useMovies';
import { downloadTimetablePdf } from './timetablePdf';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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

function TimetableControls({ day, search, onDayChange, onSearch, onDownload, downloadMessage, disabled, downloading }) {
    return (
        <div className="timetable-controls">
            <div className="day-tabs" role="tablist" aria-label="Showtimes by day">
                { days.map((item) => (
                    <button
                        className={ `day-tab ${ day === item ? 'active' : '' }` }
                        key={ item }
                        id={ `timetable-tab-${ item.toLowerCase() }` }
                        type="button"
                        role="tab"
                        aria-selected={ day === item }
                        aria-controls="timetable-panel"
                        onClick={ () => onDayChange(item) }
                    >
                        { item }
                    </button>
                )) }
            </div>
            <div className="timetable-toolbar">
                <div className="filter-bar">
                    <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="5"/>
                        <path d="m16 16 4 4"/>
                    </svg>
                    <label htmlFor="movie-search-input">Search by movie title:</label>
                    <input
                        id="movie-search-input"
                        className="search-input"
                        type="search"
                        aria-label="Search film title"
                        value={ search }
                        onChange={ (event) => onSearch(event.target.value) }
                        placeholder="Enter a movie title..."
                    />
                </div>
                <button className="button btn-glass print-pdf-btn" type="button" onClick={ onDownload }
                        disabled={ disabled }>
                    { downloading ? 'Preparing PDF...' : 'Download PDF' }
                    <span className="material-symbols-outlined">download</span>
                </button>
                { downloadMessage &&
                    <span className="timetable-download-status" role="status">{ downloadMessage }</span> }
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
                <div className="movie-title">{ getMovieTitle(movie) }</div>
                <div className="movie-meta">
                    <span className="badge-genre">{ getMovieGenre(movie) }</span>
                </div>
            </div>
            <div className="showtimes-grid" data-count={times.length}>
                { times.map((slot) => (
                    <a
                        className="showtime-btn"
                        href={createBookingHref(
                            './bookNow.html',
                            movieSlug(movie) || getMovieTitle(movie),
                            slot.date,
                            slot,
                        )}
                        key={slot.showtimeId}
                    >
                        { slot.time }<span>Screen { slot.screen }</span>
                    </a>
                )) }
            </div>
        </div>
    );
}

export function Timetable() {
    useEffect(() => {
        document.title = 'Blockbuster Theatre - Timetable';
    }, []);

    const [day, setDay] = useState('Monday');
    const screeningDates = useMemo(() => getUpcomingScreeningDates(), []);
    const screeningDate = screeningDates.find((date) => getWeekdayForDate(date) === day);
    const { movies, loading, error } = useMovies(screeningDate);
    const [search, setSearch] = useState('');
    const [downloadMessage, setDownloadMessage] = useState('');
    const [downloading, setDownloading] = useState(false);
    const filteredMovies = movies
        .filter((movie) => (
            movie.visible !== false
            && movie.isComingSoon !== true
            && getMovieTitle(movie).toLowerCase().includes(search.trim().toLowerCase())
            && getShowtimes(movie, day).length > 0
        ))
        .sort((a, b) => getMovieTitle(a).localeCompare(getMovieTitle(b), undefined, { sensitivity: 'base' }));
    const printableMovies = movies.filter((movie) => movie.visible !== false && movie.isComingSoon !== true);
    const weekCommencing = getWeekCommencing();

    if (loading) {
        return (
            <Layout current="now" loading>
                <PageLoader label="Loading movie timetable"/>
            </Layout>
        );
    }

    async function handleDownload() {
        setDownloading(true);
        setDownloadMessage('Preparing your timetable PDF...');
        try {
            await downloadTimetablePdf(printableMovies, weekCommencing);
            setDownloadMessage('Your timetable PDF is downloading.');
        } catch (downloadError) {
            setDownloadMessage(downloadError instanceof Error
                ? `Unable to download timetable PDF: ${ downloadError.message }`
                : 'Unable to download timetable PDF.');
        } finally {
            setDownloading(false);
        }
    }

    return (
        <Layout current="now">
            <div id="timetablePrintArea">
                <section className="page-banner">
                    <h1>Weekly Movie Timetable</h1>
                    <p id="weekCommencingLabel">Schedule for Week Commencing { weekCommencing }</p>
                </section>
                <TimetableControls
                    day={ day }
                    search={ search }
                    onDayChange={ setDay }
                    onSearch={ setSearch }
                    onDownload={ handleDownload }
                    downloadMessage={ downloadMessage }
                    disabled={ Boolean(error) || downloading }
                    downloading={ downloading }
                />
                <div
                    className="timetable-container"
                    id="timetable-panel"
                    role="tabpanel"
                    aria-labelledby={ `timetable-tab-${ day.toLowerCase() }` }
                    aria-live="polite"
                >
                    { error
                        ? <p>Movie timetable is temporarily unavailable.</p>
                        : filteredMovies.length
                            ? filteredMovies.map((movie) => <TimetableMovie movie={ movie } day={ day }
                                                                            key={ movieId(movie) }/>)
                            : <p>No movies available for this search and day.</p> }
                </div>
            </div>
        </Layout>
    );
}

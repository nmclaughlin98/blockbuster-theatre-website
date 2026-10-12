import { useEffect, useState } from 'react';
import { Countdown } from '../movies/index.js';
import { asset, Layout } from '../shared';
import { PageLoader } from '../shared/PageLoader';
import { useMovieDetail } from './useMovieDetail';

function formatPeople(people) {
    if (Array.isArray(people))
        return people.map((person) => String(person).trim()).filter(Boolean);
    if (typeof people === 'string')
        return people.split(',').map((person) => person.trim()).filter(Boolean);
    return [];
}

function formatReleaseDate(value) {
    if (!value) return 'Release date unavailable';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function MovieHero({ movie }) {
    const directors = formatPeople(movie.director);
    const cast = formatPeople(movie.starring);
    const rating = typeof movie.rating === 'string' ? movie.rating.toUpperCase() : '';

    return (
        <section className="movie-still">
            <img
                className="still"
                src={ movie.still || movie.largeStill || movie.poster }
                alt=""
            />
            <div className="movie-detail-caption">
                <h1>{ movie.title }</h1>
                <div className="rating-container">
                    { rating && (
                        <img className="rating-movies" src={ asset(`assets/images/ratings/${ rating }.svg`) }
                             alt={ `${ rating } age rating` }/>
                    ) }
                    <div className="runtime-movies"><strong>Run
                        Time:</strong> { movie.runtime ? `${ movie.runtime } mins` : 'TBD' }</div>
                </div>
                <div className="movie-detail-meta">
                    <p>
                        <strong>{ directors.length === 1 ? 'Director' : 'Directors' }:</strong> { directors.join(', ') || 'Unknown' }
                    </p>
                    { cast.length > 0 && <p><strong>Starring:</strong> { cast.join(', ') }</p> }
                    <p><strong>Release Date:</strong> { formatReleaseDate(movie.releaseDate) }</p>
                </div>
            </div>
        </section>
    );
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Orders showtime entries starting from today's weekday and wrapping through the rest of the week.
function sortShowtimesFromToday(showtimes) {
    const todayIndex = new Date().getDay();
    return Object.entries(showtimes || {}).sort(([dayA], [dayB]) => {
        const offsetA = (WEEKDAYS.indexOf(dayA) - todayIndex + 7) % 7;
        const offsetB = (WEEKDAYS.indexOf(dayB) - todayIndex + 7) % 7;
        return offsetA - offsetB;
    });
}

function ShowtimeSchedule({ movie, selectedDay, selectedTime, onSelectTime, bookingHref }) {
    const showtimes = sortShowtimesFromToday(movie.showtimes);

    return (
        <aside className="col col-1-3">
            <h1>Show Times:</h1>
            { showtimes.length > 0 ? showtimes.map(([day, times]) => (
                <div className="showtime-day" key={ day }>
                    <h2 className="day-of-week">{ day }</h2>
                    <div className="show-time-list">
                        { (Array.isArray(times) ? times : []).map((time) => (
                            <button
                                className={ `show-time ${ selectedDay === day && selectedTime === time ? 'active' : '' }` }
                                type="button"
                                aria-pressed={ selectedDay === day && selectedTime === time }
                                key={ time }
                                onClick={ () => onSelectTime(day, time) }
                            >
                                { time }
                            </button>
                        )) }
                    </div>
                    <hr/>
                </div>
            )) : <p>No showtimes available.</p> }
            <a className="form-button" href={ bookingHref }>Book Now</a>
        </aside>
    );
}

function MovieContent({ movie, comingSoon }) {
    const query = new URLSearchParams(window.location.search);
    const [selectedTime, setSelectedTime] = useState(
        () => query.get('time') || '',
    );
    const [selectedDay, setSelectedDay] = useState(() => {
        const requestedDay = query.get('day');
        if (WEEKDAYS.includes(requestedDay)) return requestedDay;

        const requestedTime = query.get('time');
        if (!requestedTime) return '';
        return Object.entries(movie.showtimes || {}).find(([, times]) => (
            Array.isArray(times) && times.includes(requestedTime)
        ))?.[0] || '';
    });
    const movieBookingUrl = `../bookNow.html?movie=${ encodeURIComponent(movie.title) }`;
    const bookingHref = selectedDay && selectedTime
        ? `${ movieBookingUrl }&day=${ encodeURIComponent(selectedDay) }&time=${ encodeURIComponent(selectedTime) }`
        : movieBookingUrl;
    const synopsis = typeof movie.synopsis === 'string' ? movie.synopsis.split('\n').filter(Boolean) : [];

    useEffect(() => {
        document.title = `Blockbuster Theatre - ${ movie.title }`;
    }, [movie.title]);

    function selectTime(day, time) {
        setSelectedDay(day);
        setSelectedTime(time);
    }

    return (
        <>
            <MovieHero movie={ movie }/>
            <section className="movie-page">
                <div className="col-no-border col-2-3">
                    <h2>Synopsis</h2>
                    <div id="movie-synopsis">
                        { synopsis.length > 0
                            ? synopsis.map((paragraph, index) => <p
                                key={ `${ index }-${ paragraph }` }>{ paragraph }</p>)
                            : <p>Synopsis unavailable.</p> }
                    </div>
                    <div className="move-trailer"
                         aria-label={ `${ movie.title } ${ movie.trailer ? 'trailer' : 'still' }` }>
                        { movie.trailer ? (
                            <iframe
                                className="trailer-media"
                                src={ movie.trailer }
                                title={ `${ movie.title } trailer` }
                                referrerPolicy="strict-origin-when-cross-origin"
                                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <img
                                className="trailer-media trailer-still"
                                src={ movie.still || movie.largeStill || movie.poster || asset('assets/images/logo/png/logo-full.png') }
                                alt={ `${ movie.title } still` }
                            />
                        ) }
                    </div>
                </div>
                { comingSoon ? (
                    <aside className="col col-1-3">
                        <h1>Coming Soon:</h1>
                        <Countdown movie={ movie } className="detail-countdown"/>
                    </aside>
                ) : (
                    <ShowtimeSchedule
                        movie={ movie }
                        selectedDay={ selectedDay }
                        selectedTime={ selectedTime }
                        onSelectTime={ selectTime }
                        bookingHref={ bookingHref }
                    />
                ) }
            </section>
        </>
    );
}

export function Detail({ comingSoon = false }) {
    const id = new URLSearchParams(window.location.search).get('movie') || '';
    const { movie, loading, error } = useMovieDetail(id);

    if (loading) {
        return (
            <Layout loading>
                <PageLoader label="Loading movie details"/>
            </Layout>
        );
    }

    return (
        <Layout>
            { error || !movie
                ? <p role="alert">Movie details are temporarily unavailable.</p>
                : <MovieContent movie={ movie } comingSoon={ comingSoon }/> }
        </Layout>
    );
}

import { useMemo, useState } from 'react';
import { MovieGrid } from '../../movies';
import { Layout } from '../../shared';
import { PageLoader } from '../../shared/PageLoader';
import { CollectionsView } from '../collections/Collections';
import { NowShowingSwitch } from './NowShowingSwitch';
import { useCollections } from '../collections/useCollections';
import { useMovies } from '../shared/useMovies';

function getMovieGenres(movie) {
    return [...(Array.isArray(movie.genres) ? movie.genres : []), movie.genre]
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
}

function MovieFilters({ genres, search, sort, genre, onSearch, onSort, onGenre }) {
    return (
        <div className="genre-filter-container">
            <div className="movie-filter-controls">
                <div className="search-wrapper">
                    <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="5" />
                        <path d="m16 16 4 4" />
                    </svg>
                    <label htmlFor="movie-search-input">Search by movie title:</label>
                    <input
                        id="movie-search-input"
                        className="search-input"
                        value={search}
                        onChange={(event) => onSearch(event.target.value)}
                        placeholder="Enter a movie title..."
                    />
                </div>
                <div className="sort-wrapper">
                    <label htmlFor="movie-sort-select">Sort movies:</label>
                    <select
                        id="movie-sort-select"
                        className="sort-select"
                        value={sort}
                        onChange={(event) => onSort(event.target.value)}
                    >
                        <option value="title-asc">Alphabetical (A–Z)</option>
                        <option value="title-desc">Alphabetical (Z–A)</option>
                        <option value="score-desc">Popularity / score (highest first)</option>
                        <option value="score-asc">Popularity / score (lowest first)</option>
                    </select>
                </div>
            </div>
            <div className="genre-tabs">
                {genres.map((item) => (
                    <button
                        className={`genre-chip ${genre === item ? 'active' : ''}`}
                        key={item}
                        onClick={() => onGenre(item)}
                    >
                        {item === 'all' ? 'All Genres' : item === 'Science Fiction' ? 'Sci-Fi' : item[0].toUpperCase() + item.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function NowShowing({ initialView }) {
    const requestedView = initialView || new URLSearchParams(window.location.search).get('view');
    const [view, setView] = useState(requestedView === 'collections' ? 'collections' : 'movies');
    const { movies, loading, error } = useMovies();
    const collectionState = useCollections(view === 'collections');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('title-asc');
    const [genre, setGenre] = useState('all');

    const genres = useMemo(() => [
        'all',
        ...[...new Set(
            movies
                .filter((movie) => movie.visible !== false && movie.isComingSoon !== true)
                .flatMap(getMovieGenres)
        )].sort((a, b) => a.localeCompare(b)),
    ], [movies]);

    const pageLoading = view === 'movies' ? loading : collectionState.loading;

    function changeView(nextView) {
        setView(nextView);
        const url = new URL(window.location.href);
        if (/\/collections\.html$/i.test(url.pathname)) {
            url.pathname = url.pathname.replace(/collections\.html$/i, 'nowShowing.html');
        }
        if (nextView === 'collections') url.searchParams.set('view', 'collections');
        else url.searchParams.delete('view');
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }

    const filtered = useMemo(() => {
        const result = movies.filter((movie) => (
            movie.visible !== false
            && movie.isComingSoon !== true
            && movie.title.toLowerCase().includes(search.toLowerCase())
            && (genre === 'all' || getMovieGenres(movie).includes(genre))
        ));

        return result.sort((a, b) => {
            if (sort.startsWith('title')) {
                return a.title.localeCompare(b.title) * (sort.endsWith('desc') ? -1 : 1);
            }

            return sort.endsWith('desc')
                ? (b.score ?? 0) - (a.score ?? 0)
                : (a.score ?? 0) - (b.score ?? 0);
        });
    }, [movies, search, sort, genre]);

    if (pageLoading) {
        return (
            <Layout current="now" loading>
                <PageLoader label={view === 'movies' ? 'Loading now showing movies' : 'Loading collections'} />
            </Layout>
        );
    }

    return (
        <Layout current="now">
            <section className="movie-poster">
                <div className="section-header">
                    <div>
                        <h1>{view === 'movies' ? 'Now Showing' : 'Collections'}</h1>
                        <p className="muted">
                            {view === 'movies'
                                ? 'Select a movie to view synopsis, showtimes, and book reserved luxury seats.'
                                : 'Discover connected stories and films gathered together.'}
                        </p>
                    </div>
                    {view === 'movies' && <a className="button btn-glass" href="./timetable.html">View Timetable</a>}
                </div>
                <NowShowingSwitch current={view} onChange={changeView} />
                <div
                    className="now-showing-view"
                    data-view={view}
                    key={view}
                    role="region"
                    aria-label={view === 'movies' ? 'Now showing movies' : 'Movie collections'}
                >
                    {view === 'movies'
                        ? error
                            ? <p className="collection-message" role="alert">Movie listings are temporarily unavailable.</p>
                            : <>
                                <MovieFilters
                                    genres={genres}
                                    search={search}
                                    sort={sort}
                                    genre={genre}
                                    onSearch={setSearch}
                                    onSort={setSort}
                                    onGenre={setGenre}
                                />
                                <MovieGrid movies={filtered} />
                            </>
                        : <CollectionsView
                            collections={collectionState.collections}
                            loading={collectionState.loading}
                            error={collectionState.error}
                            onRetry={collectionState.retry}
                        />}
                </div>
            </section>
        </Layout>
    );
}

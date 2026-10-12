import { useMemo, useState } from 'react';
import { MovieGrid } from '../movies';
import { Layout } from '../shared';
import { PageLoader } from '../shared/PageLoader';
import { useMovies } from './useMovies';

const genres = ['all', 'action', 'adventure', 'animation', 'comedy', 'drama', 'family', 'fantasy', 'horror', 'music', 'romance', 'science fiction', 'thriller'];

function MovieFilters({ search, sort, genre, onSearch, onSort, onGenre }) {
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
                        {item === 'all' ? 'All Genres' : item === 'science fiction' ? 'Sci-Fi' : item[0].toUpperCase() + item.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function NowShowing() {
    const { movies, loading, error } = useMovies();
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('title-asc');
    const [genre, setGenre] = useState('all');

    const filtered = useMemo(() => {
        const getGenres = (movie) => [...(movie.genres || []), movie.genre].filter(Boolean).join(' ').toLowerCase();
        const result = movies.filter((movie) => (
            movie.visible !== false
            && movie.isComingSoon !== true
            && movie.title.toLowerCase().includes(search.toLowerCase())
            && (genre === 'all' || getGenres(movie).includes(genre))
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

    if (loading) {
        return (
            <Layout current="now" loading>
                <PageLoader label="Loading now showing movies" />
            </Layout>
        );
    }

    return (
        <Layout current="now">
            <section className="movie-poster">
                <div className="section-header">
                    <div>
                        <h1>Now Showing</h1>
                        <p className="muted">
                            Select a movie to view synopsis, showtimes, and book reserved luxury seats.
                        </p>
                    </div>
                    <a className="button btn-glass" href="./timetable.html">View Timetable</a>
                </div>
                <MovieFilters
                    search={search}
                    sort={sort}
                    genre={genre}
                    onSearch={setSearch}
                    onSort={setSort}
                    onGenre={setGenre}
                />
                {error
                    ? <p>Movie listings are temporarily unavailable.</p>
                    : <MovieGrid movies={filtered} />}
            </section>
        </Layout>
    );
}

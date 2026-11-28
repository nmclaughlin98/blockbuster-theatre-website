export function sortMoviesByReleaseDate(movies) {
  return movies
    .map((movie, index) => ({
      movie,
      index,
      releaseDate: typeof movie.releaseDate === 'string' ? Date.parse(movie.releaseDate) : Number.NaN,
    }))
    .sort((a, b) => {
      const hasDateA = Number.isFinite(a.releaseDate);
      const hasDateB = Number.isFinite(b.releaseDate);

      if (hasDateA && hasDateB) return a.releaseDate - b.releaseDate || a.index - b.index;
      if (hasDateA) return -1;
      if (hasDateB) return 1;
      return a.index - b.index;
    })
    .map(({ movie }) => movie);
}

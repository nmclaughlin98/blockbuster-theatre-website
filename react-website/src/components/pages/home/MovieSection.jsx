import { useLayoutEffect, useRef, useState } from 'react';
import { MovieGrid } from '../../movies';

export function MovieSection({ title, movies }) {
  const gridRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(movies.length);
  const movieCount = movies.length;

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateVisibleCount = () => {
      const columnCount = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length;
      const rowCount = columnCount < 4 ? 2 : 1;
      const nextCount = Math.min(columnCount * rowCount, movieCount);
      setVisibleCount((current) => current === nextCount ? current : nextCount);
    };

    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(grid);
    window.addEventListener('resize', updateVisibleCount);
    updateVisibleCount();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateVisibleCount);
    };
  }, [movieCount]);

  return (
    <section className="movie-poster">
      <div className="section-header">
        <h1>{title}</h1>
        <a className="btn-glass button button-no-gap" href="./nowShowing.html">View All Movies <span className="material-symbols-outlined">chevron_right</span></a>
      </div>
      <MovieGrid movies={movies.slice(0, visibleCount)} containerRef={gridRef} />
    </section>
  );
}

import { useLayoutEffect, useRef, useState } from 'react';
import { MovieGrid } from '../../movies';
import { ButtonLink, SectionHeader } from '../../shared';
import { ChevronRightIcon } from '../../shared/Button/icons';

export function MovieSection({
  title,
  movies,
  viewAllHref = './nowShowing.html',
  viewAllLabel = 'View All Movies',
}) {
  const gridRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(movies.length);
  const movieCount = movies.length;

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateVisibleCount = () => {
      const columnCount = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length;
      const rowCount = columnCount === 2 ? 3 : columnCount < 4 ? 2 : 1;
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
      <SectionHeader title={title} className="movie-section-header">
        <ButtonLink href={viewAllHref} variant="glass" shape="rounded" rightIcon={<ChevronRightIcon />}>
          {viewAllLabel}
        </ButtonLink>
      </SectionHeader>
      <MovieGrid movies={movies.slice(0, visibleCount)} containerRef={gridRef} />
    </section>
  );
}

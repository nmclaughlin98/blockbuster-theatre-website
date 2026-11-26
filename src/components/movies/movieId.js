export function movieId(movie) {
  return encodeURIComponent(
    movie.movieId
      ?? movie.slug
      ?? movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  );
}

export function movieSlug(movie) {
  const slug = typeof movie.slug === 'string' && movie.slug.trim()
    ? movie.slug.trim()
    : typeof movie.title === 'string'
      ? movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : '';

  return slug || String(movie.movieId ?? '');
}

export function CollectionArtwork({ collection, className, alt }) {
  const imageUrl = collection.backdropUrl || collection.posterUrl;
  if (!imageUrl) return null;

  const fallbackUrl = collection.backdropUrl && collection.posterUrl
    ? collection.posterUrl
    : '';

  function handleError(event) {
    const image = event.currentTarget;
    if (fallbackUrl && image.getAttribute('src') !== fallbackUrl) {
      image.setAttribute('src', fallbackUrl);
    } else {
      image.remove();
    }
  }

  return <img className={className} src={imageUrl} alt={alt} onError={handleError} />;
}

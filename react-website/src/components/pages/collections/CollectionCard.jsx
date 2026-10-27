import { CollectionArtwork } from './CollectionArtwork';

function formatLastUpdated(value) {
  if (!value) return null;

  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value));
}

export function CollectionCard({ collection }) {
  const lastUpdated = formatLastUpdated(collection.lastUpdated);

  return (
    <a
      className="collection-card"
      href={`./collection.html?collection=${encodeURIComponent(collection.collectionId)}`}
      aria-label={`View ${collection.name} collection`}
    >
      <div className="collection-card-artwork">
        <CollectionArtwork
          collection={collection}
          className="collection-card-image"
          alt={`${collection.name} collection artwork`}
        />
      </div>
      <div className="collection-card-content">
        <h2>{collection.name}</h2>
        <p>{collection.description || 'Description unavailable.'}</p>
      </div>
    </a>
  );
}

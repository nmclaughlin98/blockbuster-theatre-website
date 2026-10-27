import { CollectionCard } from './CollectionCard';

export function CollectionsView({ collections, loading, error, onRetry }) {
  if (loading) return <p className="collection-message" role="status">Loading collections…</p>;
  if (error) {
    return (
      <div className="collection-error-state">
        <p className="collection-message" role="alert">{error.message}</p>
        <button className="button btn-glass" type="button" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (!collections.length) {
    return <p className="collection-message">No collections are available right now.</p>;
  }

  return (
    <div className="collection-card-grid">
      {collections.map((collection) => (
        <CollectionCard collection={collection} key={collection.collectionId} />
      ))}
    </div>
  );
}

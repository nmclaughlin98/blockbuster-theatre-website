import styles from './Collections.module.css';
import { CollectionCard } from './CollectionCard';
import { CollectionsSkeleton } from './CollectionsSkeleton';

export function CollectionsView({ collections, loading, error, onRetry }) {
  const activeCollections = collections.filter((collection) => collection.isActive !== false);

  if (loading) return <div className={styles.root}><CollectionsSkeleton /></div>;
  if (error) {
    return (
      <div className={styles.root}>
        <div className="collection-error-state">
          <p className="collection-message" role="alert">{error.message}</p>
          <button className="button btn-glass" type="button" onClick={onRetry}>Try again</button>
        </div>
      </div>
    );
  }
  if (!activeCollections.length) {
    return <div className={styles.root}><p className="collection-message">No collections are available right now.</p></div>;
  }

  return (
    <div className={styles.root}>
      <div className="collection-card-grid">
        {activeCollections.map((collection) => (
          <CollectionCard collection={collection} key={collection.collectionId} />
        ))}
      </div>
    </div>
  );
}

import styles from './CenteredHeadingBlock.module.css';

export function CenteredHeadingBlock({ title, description, descriptionId, className = '' }) {
  const headerClassName = [styles.banner, className].filter(Boolean).join(' ');

  return (
    <section className={headerClassName}>
      <h1 className={styles.title}>{title}</h1>
      {description != null && (
        <p className={styles.description} id={descriptionId}>{description}</p>
      )}
    </section>
  );
}

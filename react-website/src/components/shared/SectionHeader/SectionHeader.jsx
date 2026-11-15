import styles from './SectionHeader.module.css';

export function SectionHeader({
  title,
  description,
  headingLevel = 1,
  className = '',
  children,
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  const headerClassName = [styles['section-header'], className].filter(Boolean).join(' ');

  return (
    <div className={headerClassName}>
      {description == null
        ? <Heading className={styles.title}>{title}</Heading>
        : <div className={styles.content}>
          <Heading className={styles.title}>{title}</Heading>
          <p className={styles.description}>{description}</p>
        </div>}
      {children}
    </div>
  );
}

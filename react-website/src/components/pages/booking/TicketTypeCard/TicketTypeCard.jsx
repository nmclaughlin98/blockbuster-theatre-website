import styles from './TicketTypeCard.module.css';

export function TicketTypeCard({
  id,
  title,
  price,
  currencySymbol = '£',
  description,
  quantity,
  min = 0,
  max,
  onIncrement,
  onDecrement,
}) {
  const formattedPrice = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);

  return (
    <article className={styles.card}>
      <div className={styles.info}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.metadata}>
          <span className={styles.description}>{description}</span>
        </p>
        <p className={styles.price}>
          <strong>{currencySymbol}{formattedPrice}</strong>
        </p>
      </div>
      <div className={styles.stepper} role="group" aria-label={`${title} ticket quantity`}>
        <button
          className={styles.stepperButton}
          type="button"
          aria-label={`Decrease ${title} tickets`}
          disabled={quantity <= min}
          onClick={() => onDecrement(id)}
        >
          −
        </button>
        <span className={styles.quantity} aria-live="polite">{quantity}</span>
        <button
          className={styles.stepperButton}
          type="button"
          aria-label={`Increase ${title} tickets`}
          disabled={max != null && quantity >= max}
          onClick={() => onIncrement(id)}
        >
          +
        </button>
      </div>
    </article>
  );
}

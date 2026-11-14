import { TicketQRCode } from '../TicketQRCode/TicketQRCode';
import styles from './TicketPass.module.css';

function formatScreeningDate(date, time) {
  const parsedDate = new Date(`${date}T00:00:00Z`);
  const formattedDate = !Number.isNaN(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date
    ? new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsedDate).replace(',', '').replace(/^Thu(?=\s)/, 'Thurs')
    : date;

  return `${formattedDate} - ${time}`;
}

export function TicketPass({
  movieTitle, date, time, screen, seats, bookingRef, guestName, ticketCount, total, headerAction,
  isShowBookingConfirmedIndicator = true, showQRCode = true, className = '',
}) {
  return (
    <div className={`${styles.root} ${className}`.trim()}>
      <div className={styles.header}>
        <div className={styles.brand}>BLOCKBUSTER<br />THEATRE</div>
        <div className={styles.headerActions}>
          {isShowBookingConfirmedIndicator && <div className={styles.status}>Booking confirmed</div>}
          {headerAction}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.movieTitle}>{movieTitle}</div>
        <div className={styles.details}>
          <div className={styles.detail}><span>Showtime</span><strong>{formatScreeningDate(date, time)}</strong></div>
          <div className={styles.detail}><span>Screen</span><strong>Screen {screen}</strong></div>
          <div className={styles.detail}><span>Seat{seats.length === 1 ? '' : 's'}</span><strong>{seats.join(', ')}</strong></div>
          {guestName && <div className={styles.detail}><span>Guest Name</span><strong>{guestName}</strong></div>}
          {ticketCount != null && <div className={styles.detail}><span>Ticket Breakdown</span><strong>{ticketCount} Ticket{ticketCount === 1 ? '' : 's'}</strong></div>}
          {total != null && <div className={styles.detail}><span>Total</span><strong>{total}</strong></div>}
          {!showQRCode && bookingRef && <div className={styles.detail}><span>Booking reference</span><strong>{bookingRef}</strong></div>}
        </div>
        {showQRCode && (
          <>
            <div className={styles.perforation} aria-hidden="true"><div className={styles.perforationLine} /></div>
            <div className={styles.barcode}><TicketQRCode bookingRef={bookingRef} /></div>
          </>
        )}
      </div>
    </div>
  );
}

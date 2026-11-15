import { QRCodeSVG } from 'qrcode.react';
import styles from './TicketQRCode.module.css';

export function TicketQRCode({ bookingRef, size = 160, className = '' }) {
  return (
    <figure className={`${styles.root} ${className}`.trim()}>
      <div className={styles.code}>
        <QRCodeSVG
          value={bookingRef}
          size={size}
          level="M"
          boostLevel={false}
          marginSize={4}
          bgColor="#ffffff"
          fgColor="#0c0d12"
          role="img"
          aria-label={`QR code for booking reference ${bookingRef}`}
        />
      </div>
      <figcaption className={styles.reference}>REF: {bookingRef}</figcaption>
    </figure>
  );
}

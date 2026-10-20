import { useState } from 'react';
import { asset } from '../../shared';
import { StepHeader } from './BookingStepComponents';

const walletPassesEnabled = import.meta.env.VITE_ENABLE_WALLET_PASSES === 'true';
const walletPassApiUrl = import.meta.env.VITE_WALLET_PASS_API_URL?.trim()
  || 'https://blockbuster-wallet-proxy.niallmclaughlin1998.workers.dev/';

export function BookingConfirmation({
  movie, date, time, screen, selectedSeats, totalTickets, totalPrice, customer, bookingRef, onToast,
}) {
  const [walletLoading, setWalletLoading] = useState(false);

  async function createWalletPass(walletType) {
    if (!walletPassesEnabled) {
      const walletName = walletType === 'apple' ? 'Apple Wallet' : 'Google Wallet';
      onToast(`${walletName} pass generation is disabled.`);
      return;
    }

    setWalletLoading(true);
    try {
      const logoUrl = new URL(
        asset('assets/images/logo/png/logo-180.png'),
        window.location.href,
      ).href;
      const ticketPayload = {
        barcodeValue: bookingRef,
        barcodeFormat: 'QR',
        logoText: 'Blockbuster Theatre',
        colorPreset: 'dark',
        expirationDays: 2,
        color: '#9d243b',
        logoURL: logoUrl,
        iconURL: logoUrl,
        primaryFields: [{ label: 'Movie', value: movie?.title || 'Movie' }],
        secondaryFields: [
          { label: 'Date', value: date || 'Not selected' },
          { label: 'Time', value: time || 'Not selected' },
        ],
        headerFields: [
          { label: 'Seat(s)', value: selectedSeats.join(', ') || 'General Admission' },
          { label: 'Screen', value: screen || 'Not selected' },
        ],
        backFields: [
          { label: 'Demo Total', value: `£${totalPrice.toFixed(2)}` },
          { label: 'Guest Name', value: `${customer.firstName} ${customer.surname}`.trim() || 'Guest' },
          { label: 'Booking Ref', value: bookingRef },
          { label: 'Status', value: 'Booking Confirmed' },
        ],
        locations: [{
          latitude: 55.044358,
          longitude: -7.276147,
          relevantText: 'Blockbuster Theatre',
        }],
      };
      const response = await fetch(walletPassApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayload),
      });

      let passData;
      try {
        passData = await response.json();
      } catch (error) {
        throw new Error('The wallet service returned an invalid response.', { cause: error });
      }
      if (!response.ok) {
        throw new Error(passData?.error || `Wallet pass request failed (${response.status}).`);
      }

      if (walletType === 'apple') {
        if (typeof passData.applePass !== 'string' || !passData.applePass) {
          throw new Error('The wallet service did not return an Apple Wallet pass.');
        }
        const passBytes = Uint8Array.from(
          window.atob(passData.applePass),
          (character) => character.charCodeAt(0),
        );
        const passUrl = URL.createObjectURL(
          new Blob([passBytes], { type: 'application/vnd.apple.pkpass' }),
        );
        const downloadLink = document.createElement('a');
        downloadLink.href = passUrl;
        downloadLink.download = `${bookingRef}.pkpass`;
        downloadLink.click();
        window.setTimeout(() => URL.revokeObjectURL(passUrl), 1000);
      } else {
        const googleSaveUrl = passData.googleSaveUrl;
        if (typeof googleSaveUrl !== 'string') {
          throw new Error('The wallet service did not return a Google Wallet link.');
        }
        const saveUrl = new URL(googleSaveUrl);
        if (saveUrl.protocol !== 'https:' || saveUrl.hostname !== 'pay.google.com') {
          throw new Error('The wallet service returned an invalid Google Wallet link.');
        }
        window.location.assign(saveUrl.href);
      }
    } catch (error) {
      console.error('Wallet pass creation failed:', error);
      onToast(`Could not create the wallet pass: ${error.message}`);
    } finally {
      setWalletLoading(false);
    }
  }

  return (
    <fieldset className="active" data-step="4">
      <StepHeader title="Booking confirmed!" description="This is a preview only. No payment was processed or seats reserved." />
      <div className="ticket-pass">
        <div className="ticket-pass-header">
          <div className="ticket-pass-brand">BLOCKBUSTER THEATRE</div>
          <div className="ticket-pass-status">DEMO PREVIEW</div>
        </div>
        <div className="ticket-pass-body">
          <div className="ticket-movie-title">{movie?.title || 'Movie'}</div>
          <div className="ticket-details-grid">
            <div className="ticket-detail-item"><span>Showtime</span><strong>{date} at {time}</strong></div>
            <div className="ticket-detail-item"><span>Screen</span><strong>Screen {screen}</strong></div>
            <div className="ticket-detail-item"><span>Seat Numbers</span><strong>{selectedSeats.join(', ')}</strong></div>
            <div className="ticket-detail-item"><span>Demo Total</span><strong>£{totalPrice.toFixed(2)}</strong></div>
            <div className="ticket-detail-item"><span>Guest Name</span><strong>{customer.firstName} {customer.surname}</strong></div>
            <div className="ticket-detail-item"><span>Ticket Breakdown</span><strong>{totalTickets} Ticket{totalTickets === 1 ? '' : 's'}</strong></div>
          </div>
          <div className="ticket-perforation"><div className="ticket-perforation-line" /></div>
          <div className="ticket-barcode-area"><div className="ticket-booking-ref">REF: {bookingRef}</div></div>
        </div>
      </div>
      <div className="wallet-pass-actions">
        <button
          className="wallet-badge-btn"
          type="button"
          aria-label="Add demo ticket to Apple Wallet"
          disabled={walletLoading}
          onClick={() => createWalletPass('apple')}
        >
          <img src={asset('assets/images/icons/add-to-apple-wallet.svg')} alt="Add to Apple Wallet" />
        </button>
        <button
          className="wallet-badge-btn"
          type="button"
          aria-label="Add demo ticket to Google Wallet"
          disabled={walletLoading}
          onClick={() => createWalletPass('google')}
        >
          <img src={asset('assets/images/icons/add-to-google-wallet.svg')} alt="Add to Google Wallet" />
        </button>
      </div>
      <a className="form-button previous home" href="./index.html">Back to Home</a>
    </fieldset>
  );
}

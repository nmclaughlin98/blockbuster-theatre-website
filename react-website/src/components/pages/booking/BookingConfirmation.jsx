import { useState } from 'react';
import { asset } from '../../shared';
import { convertGuestAccount } from '../bookingApi';
import { StepHeader } from './BookingStepComponents';

const walletPassesEnabled = import.meta.env.VITE_ENABLE_WALLET_PASSES === 'true';
const walletPassApiUrl = import.meta.env.VITE_WALLET_PASS_API_URL?.trim()
  || 'https://blockbuster-wallet-proxy.niallmclaughlin1998.workers.dev/';

export function BookingConfirmation({
  movie, date, time, screen, totalTickets, customer, bookingDetails, onToast,
}) {
  const [walletLoading, setWalletLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [convertedAccount, setConvertedAccount] = useState(null);
  const [conversionState, setConversionState] = useState({
    loading: false, error: '', complete: false, dismissed: false,
  });
  const bookingRef = bookingDetails.bookingId;
  const selectedSeats = bookingDetails.seats;
  const movieTitle = bookingDetails.movieTitle || movie?.title || 'Movie';
  const customerEmail = bookingDetails.customerEmail || customer.email;
  const totalAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: bookingDetails.currency,
  }).format(bookingDetails.totalAmount);

  async function createAccount() {
    if (password.length < 8) {
      setConversionState((current) => ({ ...current, error: 'Use a password with at least 8 characters.' }));
      return;
    }
    if (password !== confirmPassword) {
      setConversionState((current) => ({ ...current, error: 'The passwords do not match.' }));
      return;
    }

    setConversionState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const account = await convertGuestAccount(bookingDetails.conversionToken, password);
      setConvertedAccount(account);
      setConversionState((current) => ({ ...current, loading: false, complete: true }));
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setConversionState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }

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
        primaryFields: [{ label: 'Movie', value: movieTitle }],
        secondaryFields: [
          { label: 'Date', value: date || 'Not selected' },
          { label: 'Time', value: time || 'Not selected' },
        ],
        headerFields: [
          { label: 'Seat(s)', value: selectedSeats.join(', ') },
          { label: 'Screen', value: screen || 'Not selected' },
        ],
        backFields: [
          { label: 'Total', value: totalAmount },
          { label: 'Guest Email', value: customerEmail },
          { label: 'Booking Ref', value: bookingRef },
          { label: 'Status', value: 'BOOKING CONFIRMED' },
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
      <StepHeader
        title="Booking confirmed"
        description="Your payment was processed and your seats are reserved."
      />
      <div className="ticket-pass">
        <div className="ticket-pass-header">
          <div className="ticket-pass-brand">BLOCKBUSTER THEATRE</div>
          <div className="ticket-pass-status">BOOKING CONFIRMED</div>
        </div>
        <div className="ticket-pass-body">
          <div className="ticket-movie-title">{movieTitle}</div>
          <div className="ticket-details-grid">
            <div className="ticket-detail-item"><span>Showtime</span><strong>{date} at {time}</strong></div>
            <div className="ticket-detail-item"><span>Screen</span><strong>Screen {screen}</strong></div>
            <div className="ticket-detail-item"><span>Seat Numbers</span><strong>{selectedSeats.join(', ')}</strong></div>
            <div className="ticket-detail-item"><span>Total</span><strong>{totalAmount}</strong></div>
            <div className="ticket-detail-item"><span>Confirmation Email</span><strong>{customerEmail}</strong></div>
            <div className="ticket-detail-item"><span>Ticket Breakdown</span><strong>{totalTickets} Ticket{totalTickets === 1 ? '' : 's'}</strong></div>
          </div>
          <div className="ticket-perforation"><div className="ticket-perforation-line" /></div>
          <div className="ticket-barcode-area"><div className="ticket-booking-ref">REF: {bookingRef}</div></div>
        </div>
      </div>
      {bookingDetails.conversionToken && !conversionState.dismissed && (
        <section className="guest-conversion-card" aria-labelledby="guest-conversion-title">
          {conversionState.complete ? (
            <div role="status">
              <h2 id="guest-conversion-title">Account created</h2>
              <p>Your booking is connected to {convertedAccount.email}. You are signed in for this session.</p>
            </div>
          ) : (
            <>
              <StepHeader
                title="Track your order easily next time!"
                description={`Create an account for ${customerEmail} to save your booking history. This is optional.`}
              />
              <div className="form-group">
                <label htmlFor="guest-account-password">Password</label>
                <input
                  id="guest-account-password"
                  className="form-control"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={conversionState.loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="guest-account-confirm-password">Confirm Password</label>
                <input
                  id="guest-account-confirm-password"
                  className="form-control"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={conversionState.loading}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="form-notice" role="alert">The passwords do not match.</p>
              )}
              {conversionState.error && <p className="form-notice" role="alert">{conversionState.error}</p>}
              <div className="form-actions">
                <button
                  className="form-button next"
                  type="button"
                  onClick={createAccount}
                  disabled={conversionState.loading || password.length < 8 || password !== confirmPassword}
                >
                  {conversionState.loading ? 'Creating account...' : 'Create Account'}
                </button>
                <button
                  className="form-button previous"
                  type="button"
                  onClick={() => setConversionState((current) => ({ ...current, dismissed: true }))}
                  disabled={conversionState.loading}
                >
                  Maybe later
                </button>
              </div>
            </>
          )}
        </section>
      )}
      <div className="wallet-pass-actions">
        <button
          className="wallet-badge-btn"
          type="button"
          aria-label="Add booking to Apple Wallet"
          disabled={walletLoading}
          onClick={() => createWalletPass('apple')}
        >
          <img src={asset('assets/images/icons/add-to-apple-wallet.svg')} alt="Add to Apple Wallet" />
        </button>
        <button
          className="wallet-badge-btn"
          type="button"
          aria-label="Add booking to Google Wallet"
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

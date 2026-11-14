import { useEffect, useState } from 'react';
import {
  COGNITO_AUTH_STATE_CHANGE_EVENT,
  cognitoAuth,
  getCognitoFullName,
} from '../../../auth/cognitoAuth';
import { Layout } from '../../shared';
import { getAccountBookings } from '../shared/bookingApi';
import styles from './Account.module.css';

function theatreNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function Account({ authClient = cognitoAuth, loadBookings = getAccountBookings } = {}) {
  const [account, setAccount] = useState({ status: 'loading' });
  const [view, setView] = useState('upcoming');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    document.title = 'Blockbuster Theatre - My Account';
    let active = true;
    let requestId = 0;
    let controller;

    async function loadAccount() {
      const currentRequest = ++requestId;
      controller?.abort();
      controller = new AbortController();
      setAccount({ status: 'loading' });
      try {
        const session = await authClient.fetchAuthSession();
        if (!active || currentRequest !== requestId) return;
        const token = session.tokens?.accessToken?.toString();
        if (!token) {
          setAccount({ status: 'signed-out' });
          return;
        }
        const name = getCognitoFullName(session);
        setAccount({ status: 'bookings-loading', name });
        const bookings = await loadBookings(token, controller.signal);
        if (active && currentRequest === requestId) setAccount({ status: 'ready', name, bookings });
      } catch (error) {
        if (!active || currentRequest !== requestId || error.name === 'AbortError') return;
        console.error('Unable to load account details.', error);
        setAccount((previous) => ({
          status: previous.status === 'bookings-loading' ? 'bookings-error' : 'error',
          name: previous.name,
        }));
      }
    }

    loadAccount();
    window.addEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, loadAccount);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, loadAccount);
    };
  }, [authClient, loadBookings]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError('');
    try {
      await authClient.signOut();
      window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
    } catch (error) {
      console.error('Unable to sign out.', error);
      setSignOutError('Could not log out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  const signedIn = ['ready', 'bookings-loading', 'bookings-error'].includes(account.status);
  const now = theatreNow();
  const bookings = (account.bookings ?? [])
    .filter((booking) => view === 'upcoming'
      ? `${booking.date} ${booking.time}` >= now
      : `${booking.date} ${booking.time}` < now)
    .sort((a, b) => {
      const order = `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
      return view === 'upcoming' ? order : -order;
    });

  return (
    <Layout className={styles.root} current="account">
      <section className={styles.page} aria-labelledby="account-heading">
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Blockbuster Theatre</p>
            <h1 id="account-heading">My Account</h1>
            {signedIn && <p className={styles.welcome}>Welcome{account.name ? `, ${account.name}` : ''}.</p>}
          </div>
          {signedIn && (
            <button className={styles.logout} type="button" disabled={signingOut} onClick={handleSignOut}>
              {signingOut ? 'Logging out...' : 'Log out'}
            </button>
          )}
        </div>
        {signOutError && <p role="alert" className={styles.error}>{signOutError}</p>}
        {account.status === 'loading' && <p role="status">Checking sign-in status...</p>}
        {account.status === 'signed-out' && <p>Please <a href="/login">log in</a> to view your account.</p>}
        {account.status === 'error' && <p role="alert" className={styles.error}>Could not check your account. Please refresh and try again.</p>}
        {signedIn && (
          <div className={styles.panel}>
            <h2>My bookings</h2>
            <div className={styles.switcher} aria-label="Booking view">
              <button type="button" aria-pressed={view === 'upcoming'} onClick={() => setView('upcoming')}>Upcoming</button>
              <button type="button" aria-pressed={view === 'history'} onClick={() => setView('history')}>History</button>
            </div>
            {account.status === 'bookings-loading' && <p role="status">Loading bookings...</p>}
            {account.status === 'bookings-error' && <p role="alert" className={styles.error}>Could not load your bookings. Please refresh and try again.</p>}
            {account.status === 'ready' && (
              bookings.length ? (
                <ul className={styles.bookings}>
                  {bookings.map((booking) => (
                    <li className={styles.booking} key={booking.bookingId}>
                      <div>
                        <h3>{booking.movieTitle}</h3>
                        <p>{formatDate(booking.date)} at {booking.time} · Screen {booking.screen}</p>
                        <p>Seats: {booking.seats.join(', ')}</p>
                      </div>
                      {booking.bookingRef && <p className={styles.reference}>Booking ref: {booking.bookingRef}</p>}
                    </li>
                  ))}
                </ul>
              ) : <p className={styles.empty}>No {view === 'upcoming' ? 'upcoming' : 'historical'} bookings yet.</p>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}

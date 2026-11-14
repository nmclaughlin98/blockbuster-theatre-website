import { useCallback, useEffect, useState } from 'react';
import {
  COGNITO_AUTH_STATE_CHANGE_EVENT,
  cognitoAuth,
  getCognitoFullName,
} from '../../../auth/cognitoAuth';
import { Button, Layout, TicketDownloadButton, TicketModal } from '../../shared';
import { EyeIcon, DownloadIcon } from '../../shared/Button/icons';
import { getPosterUrl } from '../../../utils/posterImages';
import { getAccountBookings, getMovieDetail } from '../shared/bookingApi';
import styles from './Account.module.css';

function theatreCutoff(now) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(now - 30 * 60 * 1000));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function getProfile(session) {
  const claims = session.tokens?.idToken?.payload ?? {};
  const readClaim = (value) => typeof value === 'string' ? value.trim() : '';
  return {
    name: getCognitoFullName(session),
    email: readClaim(claims.email),
    phone: readClaim(claims.phone_number),
  };
}

function Profile({ profile }) {
  const initials = profile.name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => Array.from(part)[0].toLocaleUpperCase()).join('');

  return (
    <div className={styles.profileCard}>
      <h2>My Profile</h2>
      <div className={styles.identity}>
        <div className={styles.avatar} aria-hidden="true">{initials || '?'}</div>
        <div className={styles.identityText}>
          <strong>{profile.name || 'Name unavailable'}</strong>
          <span>{profile.email || 'Email unavailable'}</span>
        </div>
      </div>
      <div className={styles.profileFields}>
        <label className={styles.field}>
          <span>Full name</span>
          <input value={profile.name} placeholder="Not available" readOnly disabled />
        </label>
        <label className={styles.field}>
          <span>Email address</span>
          <input type="email" value={profile.email} placeholder="Not available" readOnly disabled />
        </label>
        <label className={styles.field}>
          <span>Phone number</span>
          <input type="tel" value={profile.phone} placeholder="Not available" readOnly />
        </label>
      </div>
      <div className={styles.profileActions}>
        <p>Profile editing is not available yet.</p>
        <Button variant="secondary" shape="pill" disabled>Save changes</Button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <section className={styles.securityCard} aria-labelledby="security-heading">
      <h2 id="security-heading">Account &amp; Security</h2>
      <div className={styles.securityContent}>
        <Button variant="secondary" shape="pill" disabled>Change password</Button>
        <div className={styles.alertSettings}>
          {['Email alerts', 'SMS alerts'].map((label) => (
            <label className={styles.alertSetting} key={label}>
              <span>{label}</span>
              <input type="checkbox" role="switch" disabled aria-describedby="security-unavailable" />
              <span className={styles.switch} aria-hidden="true" />
            </label>
          ))}
        </div>
      </div>
      <p className={styles.note} id="security-unavailable">Password changes and alert preferences are not available yet.</p>
    </section>
  );
}

function navigateToLogin() {
  window.location.assign('/login');
}

function loadPosterImage(src, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const image = new window.Image();
    const finish = (error) => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve();
    };
    const abort = () => finish();
    image.onload = () => finish();
    image.onerror = () => finish(new Error('The poster image could not be loaded.'));
    signal.addEventListener('abort', abort, { once: true });
    image.src = src;
  });
}

function BookingPoster({ movieId, movieTitle, posterUrl }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const src = getPosterUrl(posterUrl, 'w185') || posterUrl;

  return (
    <div className={styles.posterPlaceholder}>
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt={`${movieTitle} poster`}
          width="56"
          height="80"
          onError={() => {
            console.warn('Unable to load booking poster image.', { movieId });
            setFailedSrc(src);
          }}
        />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" role="img" aria-label="Poster unavailable">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
        </svg>
      )}
    </div>
  );
}

export function Account({
  authClient = cognitoAuth,
  loadBookings = getAccountBookings,
  loadMovieDetail = getMovieDetail,
  onSignedOut = navigateToLogin,
} = {}) {
  const [account, setAccount] = useState({ status: 'loading' });
  const [view, setView] = useState('upcoming');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [posters, setPosters] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const closeTicket = useCallback(() => setSelectedBooking(null), []);

  useEffect(() => {
    let timer;
    function updateClock() {
      const currentTime = Date.now();
      setNow(currentTime);
      window.clearTimeout(timer);
      timer = window.setTimeout(updateClock, 60_000 - (currentTime % 60_000));
    }

    timer = window.setTimeout(updateClock, 60_000 - (Date.now() % 60_000));
    document.addEventListener('visibilitychange', updateClock);
    window.addEventListener('focus', updateClock);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', updateClock);
      window.removeEventListener('focus', updateClock);
    };
  }, []);

  useEffect(() => {
    document.title = 'Blockbuster Theatre - My Account';
    let active = true;
    let requestId = 0;
    let controller;

    async function loadAccount() {
      const currentRequest = ++requestId;
      controller?.abort();
      controller = new AbortController();
      const requestController = controller;
      setSelectedBooking(null);
      setPosters({});
      setAccount({ status: 'loading' });
      try {
        const session = await authClient.fetchAuthSession();
        if (!active || currentRequest !== requestId) return;
        const token = session.tokens?.accessToken?.toString();
        if (!token) {
          setAccount({ status: 'signed-out' });
          return;
        }
        const profile = getProfile(session);
        setAccount({ status: 'bookings-loading', profile });
        const bookings = await loadBookings(token, requestController.signal);
        if (!active || currentRequest !== requestId) return;
        const movieIds = [...new Set(bookings.map((booking) => booking.movieId).filter(Boolean))];
        const posterEntries = await Promise.all(movieIds.map(async (movieId) => {
          try {
            const movie = await loadMovieDetail(movieId, requestController.signal);
            if (typeof movie.poster !== 'string') {
              throw new Error('The movie service returned an invalid poster URL.');
            }
            if (movie.poster) {
              await loadPosterImage(getPosterUrl(movie.poster, 'w185') || movie.poster, requestController.signal);
              return [movieId, movie.poster];
            }
          } catch (error) {
            if (!requestController.signal.aborted) {
              console.warn('Unable to load booking poster.', { movieId, error });
            }
          }
          return null;
        }));
        if (!active || currentRequest !== requestId) return;
        setPosters(Object.fromEntries(posterEntries.filter(Boolean)));
        setAccount({ status: 'ready', profile, bookings });
      } catch (error) {
        if (!active || currentRequest !== requestId || error.name === 'AbortError') return;
        console.error('Unable to load account details.', error);
        setAccount((previous) => ({
          status: previous.status === 'bookings-loading' ? 'bookings-error' : 'error',
          profile: previous.profile,
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
  }, [authClient, loadBookings, loadMovieDetail]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError('');
    try {
      await authClient.signOut();
    } catch (error) {
      console.error('Unable to sign out.', error);
      setSignOutError('Could not log out. Please try again.');
      return;
    } finally {
      setSigningOut(false);
    }
    window.dispatchEvent(new window.Event(COGNITO_AUTH_STATE_CHANGE_EVENT));
    onSignedOut();
  }

  const signedIn = ['ready', 'bookings-loading', 'bookings-error'].includes(account.status);
  const cutoff = theatreCutoff(now);
  const isUpcoming = (booking) => `${booking.date} ${booking.time}` > cutoff;
  const bookings = (account.bookings ?? [])
    .filter((booking) => view === 'upcoming' ? isUpcoming(booking) : !isUpcoming(booking))
    .sort((a, b) => {
      const order = `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
      return view === 'upcoming' ? order : -order;
    });

  return (
    <Layout className={styles.root} current="account">
      <section className={styles.page} aria-labelledby="account-heading">
        <div className={styles.heading}>
          <div>
            <div className={styles.titleRow}>
              <h1 id="account-heading">My Account</h1>
              {signedIn && (
                <Button
                  variant="secondary"
                  shape="pill"
                  disabled={signingOut}
                  onClick={handleSignOut}
                >
                  {signingOut ? 'Logging out...' : 'Log out'}
                </Button>
              )}
            </div>
          </div>
        </div>
        {signOutError && <p role="alert" className={styles.error}>{signOutError}</p>}
        {account.status === 'loading' && <p role="status">Checking sign-in status...</p>}
        {account.status === 'signed-out' && <p>Please <a href="/login">log in</a> to view your account.</p>}
        {account.status === 'error' && <p role="alert" className={styles.error}>Could not check your account. Please refresh and try again.</p>}
        {signedIn && (
          <div className={styles.columns}>
            <div className={styles.profileColumn}>
              <Profile profile={account.profile} />
              <SecuritySettings />
            </div>
            <div className={styles.bookingsColumn}>
              <section className={styles.bookingsCard} aria-labelledby="bookings-heading">
                <h2 id="bookings-heading">My bookings</h2>
                <div className={styles.switcher} aria-label="Booking view">
                  <button type="button" aria-pressed={view === 'upcoming'} onClick={() => setView('upcoming')}>Upcoming</button>
                  <button type="button" aria-pressed={view === 'history'} onClick={() => setView('history')}>History</button>
                </div>
                <div className={styles.bookingContent}>
                  {account.status === 'bookings-loading' && (
                    <div role="status" className={styles.loading}>
                      <span className="loader" aria-hidden="true" />
                      <span>Loading bookings...</span>
                    </div>
                  )}
                  {account.status === 'bookings-error' && <p role="alert" className={styles.error}>Could not load your bookings. Please refresh and try again.</p>}
                  {account.status === 'ready' && (
                    bookings.length ? (
                      <ul className={styles.bookings}>
                        {bookings.map((booking) => (
                          <li className={styles.booking} key={booking.bookingId}>
                            <div className={styles.bookingDetails}>
                              <BookingPoster
                                movieId={booking.movieId}
                                movieTitle={booking.movieTitle}
                                posterUrl={posters[booking.movieId]}
                              />
                              <div className={styles.bookingText}>
                                <h3>{booking.movieTitle}</h3>
                                <p>{formatDate(booking.date)} at {booking.time}</p>
                                <p>Screen {booking.screen} · Seats {booking.seats.join(', ')}</p>
                                {booking.bookingRef && <p className={styles.reference}>Ref: {booking.bookingRef}</p>}
                              </div>
                            </div>
                            <div className={styles.bookingActions}>
                              <Button
                                variant={view === 'upcoming' ? 'primary' : 'secondary'}
                                shape="pill"
                                disabled={view === 'upcoming' && !booking.bookingRef}
                                leftIcon={<EyeIcon />}
                                onClick={() => setSelectedBooking(booking)}
                                className={styles.ticketActionButton}
                              >
                                {view === 'upcoming' ? 'View ticket' : 'View details'}
                              </Button>
                              {view === 'upcoming' && (
                                <TicketDownloadButton
                                  booking={booking}
                                  className={styles.ticketActionButton}
                                  errorClassName={styles.downloadError}
                                />
                              )}
                            </div>
                            {view === 'upcoming' && !booking.bookingRef && <p className={styles.note}>No booking reference is available for this ticket.</p>}
                          </li>
                        ))}
                      </ul>
                    ) : <p className={styles.empty}>No {view === 'upcoming' ? 'upcoming' : 'historical'} bookings yet.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
        {signedIn && selectedBooking && (
          <TicketModal booking={selectedBooking} onClose={closeTicket} showQRCode={isUpcoming(selectedBooking)} />
        )}
      </section>
    </Layout>
  );
}

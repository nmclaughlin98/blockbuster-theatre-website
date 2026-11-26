import { useLocation } from 'react-router-dom';
import { useConfig } from '../../../context/ConfigContext';
import { BookNowFab } from '../BookingShortcut/BookNowFab';
import { BackToTop } from '../BackToTop/BackToTop';
import { Footer } from '../Footer/Footer';
import { Header } from '../Header/Header';

const bookNowFabExcludedPages = new Set(['booking', 'login', 'account', 'movie', 'about']);
const bookNowFabExcludedPaths = ['/movie/', '/coming-soon/'];

export function Layout({ current, children, loading = false, className }) {
  const { pathname } = useLocation();
  const { config } = useConfig();
  const { bookingEnabled } = config.features;
  const excludedByPath = bookNowFabExcludedPaths.some((path) => pathname.startsWith(path));

  return (
    <>
      <Header current={current} />
      <main className={className}>{children}</main>
      {bookingEnabled && !bookNowFabExcludedPages.has(current) && !excludedByPath && <BookNowFab />}
      {/* <BackToTop /> */}
      {!loading && <Footer />}
    </>
  );
}
import { BookingShortcut } from '../BookingShortcut/BookingShortcut';
import { excludedPages } from '../BookingShortcut/ExcludedPages';
import { BackToTop } from '../BackToTop/BackToTop';
import { Footer } from '../Footer/Footer';
import { Header } from '../Header/Header';

export function Layout({ current, children, loading = false, className }) {
  return (
    <>
      <Header current={current} />
      <main className={className}>{children}</main>
      {!excludedPages.includes(current) && <BookingShortcut />}
      <BackToTop />
      {!loading && <Footer />}
    </>
  );
}

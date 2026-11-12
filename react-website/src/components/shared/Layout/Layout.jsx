import { BookingShortcut } from '../BookingShortcut/BookingShortcut';
import { BackToTop } from '../BackToTop/BackToTop';
import { Footer } from '../Footer/Footer';
import { Header } from '../Header/Header';

export function Layout({ current, children, loading = false, className }) {
  return (
    <>
      <Header current={current} />
      <main className={className}>{children}</main>
      {current !== 'booking' && <BookingShortcut />}
      <BackToTop />
      {!loading && <Footer />}
    </>
  );
}

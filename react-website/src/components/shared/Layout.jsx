import { BackToTop } from './BackToTop';
import { BookNowFab } from './BookNowFab';
import { Footer } from './Footer';
import { Header } from './Header';

export function Layout({ current, children, loading = false, className }) {
  return (
    <>
      <Header current={current} />
      <main className={className}>{children}</main>
      <BackToTop />
      <BookNowFab current={current} />
      {!loading && <Footer />}
    </>
  );
}

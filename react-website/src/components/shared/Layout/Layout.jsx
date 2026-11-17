import { BookNowFab } from '../BookNowFab';
import { BackToTop } from '../BackToTop/BackToTop';
import { Footer } from '../Footer/Footer';
import { Header } from '../Header/Header';

const bookNowFabExcludedPages = new Set(['booking', 'login', 'account']);

export function Layout({ current, children, loading = false, className }) {
  return (
    <>
      <Header current={current} />
      <main className={className}>{children}</main>
      {!bookNowFabExcludedPages.has(current) && <BookNowFab />}
      {/* <BackToTop /> */}
      {!loading && <Footer />}
    </>
  );
}

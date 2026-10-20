import {
  About,
  Booking,
  CollectionDetail,
  ComingSoon,
  Detail,
  Home,
  NowShowing,
  Timetable,
} from './components/pages';
import { useRouter } from './router';

export default function App() {
  const { pathname, search } = useRouter();
  const path = pathname.toLowerCase();

  let page = <Home />;
  if (path.includes('booknow')) page = <Booking />;
  else if (path.endsWith('/collections.html')) page = <NowShowing initialView="collections" />;
  else if (path.endsWith('/collection.html')) page = <CollectionDetail />;
  else if (path.includes('movie-detail-coming-soon')) page = <Detail comingSoon />;
  else if (path.includes('movie-detail')) page = <Detail />;
  else if (path.includes('nowshowing')) page = <NowShowing />;
  else if (path.includes('comingsoon')) page = <ComingSoon />;
  else if (path.includes('timetable')) page = <Timetable />;
  else if (path.includes('about')) page = <About />;

  // Remounting on route change re-runs each page's initial state (e.g. query
  // params read once via useState/useMemo initializers in Detail/Booking).
  return <div className="app-shell" key={path + search}>{page}</div>;
}

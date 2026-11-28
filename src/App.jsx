import { useCallback, useEffect } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  Account,
  About,
  Booking,
  CollectionDetail,
  ComingSoon,
  Detail,
  Home,
  Login,
  NowShowing,
  Signup,
  Timetable,
} from './pages';
import { COGNITO_AUTH_STATE_CHANGE_EVENT } from './auth/cognitoAuth';
import { Toast } from './components/shared/Toast/Toast';
import { useToast } from './components/shared/Toast/useToast';
import { useConfig } from './context/ConfigContext';
import { StatusScreen } from './components/shared/StatusScreen/StatusScreen';

function FeatureRoute({ enabled, children }) {
  if (!enabled) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function LegacyPageRedirect({ to, preserveSearch = false }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${preserveSearch ? search : ''}`} replace />;
}

function LegacyMovieRedirect({ comingSoon = false }) {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('movie');
  if (!slug) return <Navigate to="/" replace />;

  const route = comingSoon ? '/coming-soon' : '/movie';
  const remainingParams = new URLSearchParams(searchParams);
  remainingParams.delete('movie');
  const query = remainingParams.toString();
  return (
    <Navigate
      to={`${route}/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`}
      replace
    />
  );
}

function LegacyCollectionRedirect() {
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get('collection');
  return collectionId
    ? <Navigate to={`/collection/${encodeURIComponent(collectionId)}`} replace />
    : <Navigate to="/collections" replace />;
}

function LegacyNowShowingRedirect() {
  const [searchParams] = useSearchParams();
  return searchParams.get('view') === 'collections'
    ? <Navigate to="/now-showing?view=collections" replace />
    : <Navigate to="/now-showing" replace />;
}

function LegacyMovieParamRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/movie/${encodeURIComponent(slug)}`} replace />;
}

export default function App() {
  const location = useLocation();
  const { toast, setToastMessage } = useToast();
  const { config, isConfigLoading, isOffline, refreshConfig } = useConfig();
  const dismissToast = useCallback(() => setToastMessage(''), [setToastMessage]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    function handleAuthChange(event) {
      if (event.detail?.toastMessage) setToastMessage(event.detail.toastMessage, 'success');
    }

    function handleToastEvent(event) {
      if (event.detail?.message) {
        setToastMessage(event.detail.message, event.detail.type || 'info');
      }
    }

    window.addEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, handleAuthChange);
    window.addEventListener('blockbuster:toast', handleToastEvent);
    return () => {
      window.removeEventListener(COGNITO_AUTH_STATE_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener('blockbuster:toast', handleToastEvent);
    };
  }, [setToastMessage]);

  // 1. Wait for S3 config before mounting routes so disabled UI never flashes
  if (isConfigLoading) {
    return <StatusScreen mode="loading" />;
  }

  // 2. Full-site lockdown when maintenance mode is active or browser is offline
  if (config.maintenanceMode) {
    return (
      <StatusScreen
        mode="maintenance"
        message={config.maintenanceMessage}
        onRetry={refreshConfig}
      />
    );
  }

  if (isOffline) {
    return (
      <StatusScreen
        mode="offline"
        message="You appear to be offline. Check your connection and try again."
        onRetry={refreshConfig}
      />
    );
  }

  const { loginEnabled, bookingEnabled } = config.features;

  return (
    <>
      <div className="app-shell" key={`${location.pathname}${location.search}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:slug" element={<Detail />} />
          <Route path="/coming-soon/:slug" element={<Detail comingSoon />} />
          <Route
            path="/book-now"
            element={
              <FeatureRoute enabled={bookingEnabled}>
                <Booking />
              </FeatureRoute>
            }
          />
          <Route path="/now-showing" element={<NowShowing />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/account"
            element={
              <FeatureRoute enabled={loginEnabled}>
                <Account />
              </FeatureRoute>
            }
          />
          <Route
            path="/login"
            element={
              <FeatureRoute enabled={loginEnabled}>
                <Login />
              </FeatureRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <FeatureRoute enabled={loginEnabled}>
                <Signup />
              </FeatureRoute>
            }
          />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/collection/:collectionId" element={<CollectionDetail />} />
          <Route path="/collections" element={<Navigate to="/now-showing?view=collections" replace />} />

          <Route path="/movie-detail.html" element={<LegacyMovieRedirect />} />
          <Route path="/movie-detail-coming-soon.html" element={<LegacyMovieRedirect comingSoon />} />
          <Route path="/movie=:slug" element={<LegacyMovieParamRedirect />} />
          <Route path="/collection.html" element={<LegacyCollectionRedirect />} />
          <Route path="/collections.html" element={<LegacyNowShowingRedirect />} />
          <Route path="/nowShowing" element={<LegacyNowShowingRedirect />} />
          <Route path="/nowShowing.html" element={<LegacyNowShowingRedirect />} />
          <Route path="/comingSoon" element={<LegacyPageRedirect to="/coming-soon" />} />
          <Route path="/comingSoon.html" element={<LegacyPageRedirect to="/coming-soon" />} />
          <Route path="/bookNow" element={<LegacyPageRedirect to="/book-now" preserveSearch />} />
          <Route path="/bookNow.html" element={<LegacyPageRedirect to="/book-now" preserveSearch />} />
          <Route path="/about.html" element={<LegacyPageRedirect to="/about" />} />
          <Route path="/account.html" element={<LegacyPageRedirect to="/account" />} />
          <Route path="/login.html" element={<LegacyPageRedirect to="/login" />} />
          <Route path="/signup.html" element={<LegacyPageRedirect to="/signup" />} />
          <Route path="/timetable.html" element={<LegacyPageRedirect to="/timetable" />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />
    </>
  );
}
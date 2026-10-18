import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
import 'whatwg-fetch';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/main.css';
import './styles/media-queries.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

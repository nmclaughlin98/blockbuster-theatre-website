import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
});
dom.window.requestAnimationFrame = (callback) => dom.window.setTimeout(callback, 0);
dom.window.cancelAnimationFrame = (frame) => dom.window.clearTimeout(frame);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: dom.window.navigator,
});

const vite = await createServer({
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});
const { Home } = await vite.ssrLoadModule('/src/components/pages/home/Home.jsx');
after(() => vite.close());

test('shares the Home movie request with Offers and starts collections in parallel', async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  const pendingCollectionRequests = new Map();
  globalThis.fetch = (url) => {
    const requestedUrl = new URL(url);
    requestedUrls.push(requestedUrl);
    if (requestedUrl.pathname.endsWith('/movies')) {
      return Promise.resolve(new Response(JSON.stringify({ movies: [], nextToken: null })));
    }
    if (requestedUrl.pathname.endsWith('/film-selections')) {
      return Promise.resolve(new Response(JSON.stringify({ selections: [] })));
    }
    const collectionId = requestedUrl.pathname.split('/').at(-1);
    return new Promise((resolve) => pendingCollectionRequests.set(collectionId, resolve));
  };

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(createElement(
        MemoryRouter,
        null,
        createElement(Home),
      ));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(requestedUrls.filter(({ pathname }) => pathname.endsWith('/movies')).length, 1);
    assert.deepEqual(
      requestedUrls
        .filter(({ pathname }) => pathname.includes('/collections/'))
        .map(({ pathname }) => pathname.split('/').at(-1)),
      ['8706566', '8706524'],
    );

    for (const [collectionId, resolve] of pendingCollectionRequests) {
      resolve(new Response(JSON.stringify({
        collection: {
          collectionId,
          name: `Collection ${collectionId}`,
          description: '',
          posterUrl: '',
          backdropUrl: '',
          movieIds: [],
        },
        movies: [],
      })));
    }
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});

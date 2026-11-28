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
const { Offers } = await vite.ssrLoadModule('/src/pages/home/Offers.jsx');
after(() => vite.close());

function filmSelectionsResponse(selections) {
  return new Response(JSON.stringify({ selections }));
}

function offer(id, featuredMovieId, displayLabel) {
  return {
    type: 'offer',
    id,
    offerId: id,
    featuredMovieId,
    pricingId: `pricing-${id}`,
    displayLabel,
  };
}

function renderOffers(root, props) {
  root.render(createElement(
    MemoryRouter,
    null,
    createElement(Offers, props),
  ));
}

test('hides the section while loading and only renders offers for visible movies', async () => {
  const originalFetch = globalThis.fetch;
  let resolveFetch;
  globalThis.fetch = () => new Promise((resolve) => {
    resolveFetch = resolve;
  });

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      renderOffers(root, {
        movies: [
          { movieId: 1, title: 'Visible Movie', visible: true },
          { movieId: 2, title: 'Hidden Movie', visible: false },
        ],
      });
      await Promise.resolve();
    });

    assert.equal(container.querySelector('.offers'), null);

    resolveFetch(filmSelectionsResponse([
      offer('visible-offer', '1', 'Visible Offer'),
      offer('hidden-offer', '2', 'Hidden Offer'),
    ]));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    assert.ok(container.querySelector('.offers'));
    assert.match(container.textContent, /Visible Offer/);
    assert.doesNotMatch(container.textContent, /Hidden Offer/);
    assert.equal(container.querySelectorAll('.offers-grid a').length, 1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});

test('does not render the section when no offers are available', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(filmSelectionsResponse([]));

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      renderOffers(root, { movies: [] });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(container.querySelector('.offers'), null);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});

test('keeps offer loading errors visible without rendering the section', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(filmSelectionsResponse([{}]));

  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      renderOffers(root, { movies: [] });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(container.querySelector('.offers'), null);
    assert.equal(container.querySelector('[role="alert"]')?.textContent,
      'The booking service returned an invalid film selection.');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    globalThis.fetch = originalFetch;
  }
});

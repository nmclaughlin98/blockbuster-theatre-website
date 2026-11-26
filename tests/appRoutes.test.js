import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('routes movie slugs to standard and coming-soon detail views', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const [{ default: App }, { MovieCard }] = await Promise.all([
      vite.ssrLoadModule('/src/App.jsx'),
      vite.ssrLoadModule('/src/components/movies/MovieCard.jsx'),
    ]);

    function renderAt(path) {
      return renderToStaticMarkup(createElement(
        MemoryRouter,
        { initialEntries: [path] },
        createElement(App),
      ));
    }

    const standardDetail = renderAt('/movie/back-to-the-future');
    const comingSoonDetail = renderAt('/coming-soon/avengers-doomsday');

    assert.match(standardDetail, /showtimes-schedule/);
    assert.doesNotMatch(standardDetail, /detail-countdown/);
    assert.match(comingSoonDetail, /detail-countdown/);
    assert.doesNotMatch(comingSoonDetail, /showtimes-schedule/);

    const card = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(MovieCard, {
        movie: { slug: 'back-to-the-future', title: 'Back to the Future' },
      }),
    ));
    assert.match(card, /href="\/movie\/back-to-the-future"/);
  } finally {
    await vite.close();
  }
});

test('resets scroll on page changes and keeps auth notifications across navigation', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost/',
    });
    const oldWindow = globalThis.window;
    const oldDocument = globalThis.document;
    const oldHTMLElement = globalThis.HTMLElement;
    const oldActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.HTMLElement = dom.window.HTMLElement;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
    const scrollCalls = [];
    window.scrollTo = (options) => scrollCalls.push(options);

    const vite = await createServer({
      configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
      server: { middlewareMode: true },
      appType: 'custom',
      logLevel: 'silent',
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    let navigate;
    function NavigationControl() {
      navigate = useNavigate();
      return null;
    }

    try {
      const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
      const { COGNITO_AUTH_STATE_CHANGE_EVENT } = await vite.ssrLoadModule('/src/auth/cognitoAuth.js');
      await act(async () => {
        root.render(createElement(MemoryRouter, { initialEntries: ['/about'] },
          createElement(NavigationControl), createElement(App)));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      assert.deepEqual(scrollCalls, [{ top: 0, left: 0, behavior: 'instant' }]);

      await act(async () => {
        window.dispatchEvent(new window.CustomEvent(COGNITO_AUTH_STATE_CHANGE_EVENT, {
          detail: { toastMessage: 'Login successful.' },
        }));
        navigate('/login');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      assert.equal(scrollCalls.length, 2);
      assert.match(container.textContent, /Login successful\./);
      assert.equal(container.querySelector('[data-type="success"]').getAttribute('aria-hidden'), 'false');

      await act(async () => {
        navigate('/login?view=test');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      assert.equal(scrollCalls.length, 2);
      assert.match(container.textContent, /Login successful\./);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      await vite.close();
      dom.window.close();
      globalThis.window = oldWindow;
      globalThis.document = oldDocument;
      globalThis.HTMLElement = oldHTMLElement;
      globalThis.IS_REACT_ACT_ENVIRONMENT = oldActEnvironment;
      if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
      else delete globalThis.navigator;
    }
});

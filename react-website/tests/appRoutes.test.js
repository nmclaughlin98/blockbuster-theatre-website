import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
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

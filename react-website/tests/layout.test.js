import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});
const { Layout } = await vite.ssrLoadModule('/src/components/shared/Layout/Layout.jsx');
after(() => vite.close());

function renderLayout(pathname, current) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: [pathname] },
    createElement(Layout, { current }, 'Page content'),
  ));
}

test('hides the booking FAB on movie detail routes but shows it on the coming-soon listing', () => {
  for (const pathname of ['/movie/back-to-the-future', '/coming-soon/back-to-the-future']) {
    assert.doesNotMatch(renderLayout(pathname), /book-now-fab/);
  }
  assert.match(renderLayout('/coming-soon', 'coming'), /book-now-fab/);
});

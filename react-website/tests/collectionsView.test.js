import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('shows collections unless they are explicitly inactive', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { CollectionsView } = await vite.ssrLoadModule(
      '/src/components/pages/collections/Collections.jsx',
    );
    const collection = (collectionId, name, isActive) => ({
      collectionId,
      name,
      description: `${name} description.`,
      posterUrl: '',
      backdropUrl: '',
      ...(isActive === undefined ? {} : { isActive }),
    });
    const markup = renderToStaticMarkup(createElement(CollectionsView, {
      collections: [
        collection('1', 'Active Collection', true),
        collection('2', 'Unspecified Collection'),
        collection('3', 'Inactive Collection', false),
      ],
      loading: false,
      error: null,
      onRetry: () => {},
    }));

    assert.match(markup, /Active Collection/);
    assert.match(markup, /Unspecified Collection/);
    assert.doesNotMatch(markup, /Inactive Collection/);

    const emptyMarkup = renderToStaticMarkup(createElement(CollectionsView, {
      collections: [collection('4', 'Only Inactive Collection', false)],
      loading: false,
      error: null,
      onRetry: () => {},
    }));
    assert.match(emptyMarkup, /No collections are available right now/);
    assert.doesNotMatch(emptyMarkup, /Only Inactive Collection/);
  } finally {
    await vite.close();
  }
});

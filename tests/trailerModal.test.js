import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
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
const { TrailerModal } = await vite.ssrLoadModule('/src/components/shared/TrailerModal/TrailerModal.jsx');
after(() => vite.close());

function TrailerModalHarness() {
  const [url, setUrl] = useState('');
  return createElement(
    'div',
    null,
    createElement('button', { type: 'button', onClick: () => setUrl('https://video.example/embed/123?rel=0#start') }, 'Open'),
    createElement(TrailerModal, { url, onClose: () => setUrl(''), title: 'Example trailer' }),
  );
}

test('opens trailers with autoplay and closes on Escape or backdrop click', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(TrailerModalHarness));
  });

  const openButton = container.querySelector('button');
  await act(async () => {
    openButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });

  const backdrop = container.querySelector('[role="dialog"]').parentElement;
  assert.equal(container.querySelector('iframe').getAttribute('src'), 'https://video.example/embed/123?rel=0&autoplay=1#start');
  assert.equal(backdrop.getAttribute('aria-hidden'), 'false');
  assert.equal(document.body.classList.contains('noScroll'), true);

  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  });
  assert.equal(backdrop.getAttribute('aria-hidden'), 'true');
  assert.equal(document.body.classList.contains('noScroll'), false);

  await act(async () => {
    openButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  const reopenedBackdrop = container.querySelector('[role="dialog"]').parentElement;
  await act(async () => {
    reopenedBackdrop.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  assert.equal(reopenedBackdrop.getAttribute('aria-hidden'), 'true');

  await act(async () => root.unmount());
  container.remove();
});

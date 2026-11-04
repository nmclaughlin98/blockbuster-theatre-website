import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createServer } from 'vite';

test('requires a preview tab instead of falling back to a download', async () => {
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { openTimetablePdf } = await vite.ssrLoadModule(
      '/src/components/pages/timetable/timetablePdf.js',
    );

    assert.throws(
      () => openTimetablePdf([], '30/10/2026'),
      /Open a new tab before generating the timetable PDF/,
    );
  } finally {
    await vite.close();
  }
});

test('opens the generated PDF in the supplied preview tab', async () => {
  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let createdBlob;
  let intervalCallback;
  const originalWindow = globalThis.window;
  const previewWindow = {
    closed: false,
    location: {
      replace(url) {
        this.href = url;
      },
    },
  };
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { openTimetablePdf } = await vite.ssrLoadModule(
      '/src/components/pages/timetable/timetablePdf.js',
    );
    URL.createObjectURL = (blob) => {
      createdBlob = blob;
      return 'blob:timetable';
    };
    URL.revokeObjectURL = () => {};
    globalThis.window = {
      setInterval(callback) {
        intervalCallback = callback;
        return 1;
      },
      clearInterval() {},
    };
    globalThis.document = {
      createElement() {
        assert.fail('Opening the PDF should not create a download link.');
      },
    };

    openTimetablePdf([], '30/10/2026', previewWindow);

    assert.equal(createdBlob.type, 'application/pdf');
    assert.equal(previewWindow.location.href, 'blob:timetable');
    previewWindow.closed = true;
    intervalCallback();
  } finally {
    await vite.close();
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.window = originalWindow;
  }
});

import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createServer } from 'vite';

test('creates a PDF blob and triggers a download with the timetable filename', async () => {
  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalSetTimeout = globalThis.setTimeout;
  let createdBlob;
  let clicked = false;
  let removed = false;
  let appended = false;
  const downloadLink = {
    style: {},
    click() {
      clicked = true;
    },
    remove() {
      removed = true;
    },
  };
  const vite = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { downloadTimetablePdf } = await vite.ssrLoadModule(
      '/src/components/pages/timetable/timetablePdf.js',
    );
    URL.createObjectURL = (blob) => {
      createdBlob = blob;
      return 'blob:timetable';
    };
    URL.revokeObjectURL = () => {};
    globalThis.setTimeout = () => 1;
    globalThis.document = {
      createElement(tagName) {
        assert.equal(tagName, 'a');
        return downloadLink;
      },
      body: {
        appendChild(element) {
          assert.equal(element, downloadLink);
          appended = true;
        },
      },
    };

    downloadTimetablePdf([], '30/10/2026');

    assert.equal(createdBlob.type, 'application/pdf');
    assert.equal(downloadLink.href, 'blob:timetable');
    assert.equal(downloadLink.download, 'blockbuster-timetable-week-commencing-30-10-2026.pdf');
    assert.equal(appended, true);
    assert.equal(clicked, true);
    assert.equal(removed, true);
  } finally {
    await vite.close();
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.setTimeout = originalSetTimeout;
  }
});

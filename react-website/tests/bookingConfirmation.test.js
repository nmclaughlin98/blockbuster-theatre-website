import assert from 'node:assert/strict';
import test from 'node:test';
import { MOVIES_API_URL } from '../src/config.js';
import {
  createBookingConfirmationPayload,
  createBookingConfirmationSubmitter,
  sendBookingConfirmation,
} from '../src/components/pages/bookingApi.js';

const customer = {
  firstName: 'Avery',
  surname: 'Example',
  email: 'avery@example.com',
  phone: '',
};
const selection = { title: 'Example Film' };
const payloadValues = {
  bookingRef: 'BBT-123456',
  customer,
  selectedSelection: selection,
  date: 'Tue 20 Oct 2026',
  time: '19:30',
  screen: '2',
  selectedSeats: ['A1', 'A2'],
  totalTickets: 2,
  totalPrice: 15.2,
};
const expectedPayload = {
  bookingRef: 'BBT-123456',
  customer,
  movieTitle: 'Example Film',
  date: 'Tue 20 Oct 2026',
  time: '19:30',
  screen: '2',
  seats: ['A1', 'A2'],
  tickets: 2,
  totalPrice: 15.2,
};

function mockFetch(handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test('constructs and sends the exact confirmation request through the configured API base URL', async () => {
  const payload = createBookingConfirmationPayload(payloadValues);
  let request;
  const restoreFetch = mockFetch(async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ message: 'Demo email sent.' }));
  });

  try {
    await sendBookingConfirmation(payload);
    assert.equal(request.url, `${MOVIES_API_URL}/booking/confirmation`);
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(request.options.body), expectedPayload);
  } finally {
    restoreFetch();
  }
});

test('navigates after a successful send', async () => {
  const events = [];
  const submit = createBookingConfirmationSubmitter(async () => events.push('sent'));

  const succeeded = await submit({
    payload: expectedPayload,
    onSendingChange: (value) => events.push(`sending:${value}`),
    onSuccess: () => events.push('navigate'),
    onError: (error) => events.push(`error:${error.message}`),
  });

  assert.equal(succeeded, true);
  assert.deepEqual(events, ['sending:true', 'sent', 'sending:false', 'navigate']);
});

test('keeps failures on the current step and allows retry with the same reference', async () => {
  const events = [];
  let attempts = 0;
  const submit = createBookingConfirmationSubmitter(async (payload) => {
    attempts += 1;
    assert.equal(payload.bookingRef, expectedPayload.bookingRef);
    if (attempts === 1) throw new Error('SES sandbox recipient is not verified.');
  });
  const callbacks = {
    payload: expectedPayload,
    onSendingChange: (value) => events.push(`sending:${value}`),
    onSuccess: () => events.push('navigate'),
    onError: (error) => events.push(`error:${error.message}`),
  };

  assert.equal(await submit(callbacks), false);
  assert.deepEqual(events, [
    'sending:true',
    'error:SES sandbox recipient is not verified.',
    'sending:false',
  ]);
  assert.equal(await submit(callbacks), true);
  assert.equal(attempts, 2);
  assert.equal(events.at(-1), 'navigate');
});

test('ignores duplicate submissions while a request is pending', async () => {
  let resolveSend;
  let sendCount = 0;
  let navigationCount = 0;
  const submit = createBookingConfirmationSubmitter(() => {
    sendCount += 1;
    return new Promise((resolve) => { resolveSend = resolve; });
  });
  const callbacks = {
    payload: expectedPayload,
    onSendingChange: () => {},
    onSuccess: () => { navigationCount += 1; },
    onError: (error) => { throw error; },
  };

  const firstSubmission = submit(callbacks);
  const duplicateSubmission = await submit(callbacks);
  assert.equal(duplicateSubmission, false);
  assert.equal(sendCount, 1);

  resolveSend({ message: 'Demo email sent.' });
  assert.equal(await firstSubmission, true);
  assert.equal(navigationCount, 1);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { getInitialsHex } from '../src/utils/getInitialsHex.js';

test('returns deterministic HSL-derived six-digit colors for initials', () => {
  assert.deepEqual(
    Object.fromEntries(['NM', 'RH', 'JD'].map((initials) => [initials, getInitialsHex(initials)])),
    { NM: '#CEB727', RH: '#9327CE', JD: '#2778CE' },
  );
});

test('normalizes initials before generating a color', () => {
  assert.equal(getInitialsHex(' nm '), getInitialsHex('NM'));
  assert.equal(getInitialsHex('rh'), getInitialsHex('RH'));
});

test('uses the neutral slate fallback for empty or invalid inputs', () => {
  for (const initials of ['', ' \t\n ', null, undefined, 42, {}]) {
    assert.equal(getInitialsHex(initials), '#64748B');
  }
});

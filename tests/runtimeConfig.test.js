import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_RUNTIME_CONFIG,
  normalizeRuntimeConfig,
} from '../src/context/runtime-config.js';

test('provides safe runtime defaults for linking and ticket limits', () => {
  assert.deepEqual(normalizeRuntimeConfig({}), DEFAULT_RUNTIME_CONFIG);
  assert.equal(DEFAULT_RUNTIME_CONFIG.features.allowLinkBookings, false);
  assert.equal(DEFAULT_RUNTIME_CONFIG.limits.maxTickets, 10);
});

test('normalizes grouped runtime settings while preserving existing feature flags', () => {
  assert.deepEqual(normalizeRuntimeConfig({
    maintenanceMode: true,
    maintenanceMessage: 'Back soon.',
    features: {
      loginEnabled: false,
      bookingEnabled: true,
      allowLinkBookings: true,
    },
    limits: { maxTickets: 6 },
  }), {
    maintenanceMode: true,
    maintenanceMessage: 'Back soon.',
    features: {
      loginEnabled: false,
      bookingEnabled: true,
      allowLinkBookings: true,
    },
    limits: { maxTickets: 6 },
  });
});

test('supports flat migrated settings and falls back for invalid values', () => {
  assert.deepEqual(normalizeRuntimeConfig({
    allowLinkBookings: true,
    maxTickets: 0,
  }), {
    ...DEFAULT_RUNTIME_CONFIG,
    features: { ...DEFAULT_RUNTIME_CONFIG.features, allowLinkBookings: true },
  });
});

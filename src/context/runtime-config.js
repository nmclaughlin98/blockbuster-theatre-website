export const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  maintenanceMode: false,
  maintenanceMessage: "We're updating our cinema listings. Back shortly!",
  features: Object.freeze({
    loginEnabled: true,
    bookingEnabled: true,
    allowLinkBookings: false,
  }),
  limits: Object.freeze({
    maxTickets: 10,
  }),
});

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeRuntimeConfig(value) {
  const config = isRecord(value) ? value : {};
  const features = isRecord(config.features) ? config.features : {};
  const limits = isRecord(config.limits) ? config.limits : {};
  const allowLinkBookings = features.allowLinkBookings ?? config.allowLinkBookings;
  const maxTickets = limits.maxTickets ?? config.maxTickets;

  return {
    maintenanceMode: typeof config.maintenanceMode === 'boolean'
      ? config.maintenanceMode
      : DEFAULT_RUNTIME_CONFIG.maintenanceMode,
    maintenanceMessage: typeof config.maintenanceMessage === 'string'
      ? config.maintenanceMessage
      : DEFAULT_RUNTIME_CONFIG.maintenanceMessage,
    features: {
      loginEnabled: typeof features.loginEnabled === 'boolean'
        ? features.loginEnabled
        : DEFAULT_RUNTIME_CONFIG.features.loginEnabled,
      bookingEnabled: typeof features.bookingEnabled === 'boolean'
        ? features.bookingEnabled
        : DEFAULT_RUNTIME_CONFIG.features.bookingEnabled,
      allowLinkBookings: typeof allowLinkBookings === 'boolean'
        ? allowLinkBookings
        : DEFAULT_RUNTIME_CONFIG.features.allowLinkBookings,
    },
    limits: {
      maxTickets: Number.isSafeInteger(maxTickets) && maxTickets > 0
        ? maxTickets
        : DEFAULT_RUNTIME_CONFIG.limits.maxTickets,
    },
  };
}

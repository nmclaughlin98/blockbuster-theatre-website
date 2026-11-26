export const DEFAULT_RUNTIME_CONFIG = {
  maintenanceMode: false,
  maintenanceMessage: "We're updating our cinema listings. Back shortly!",
  features: {
    loginEnabled: true,
    bookingEnabled: true,
    allowLinkBookings: true,
  },
  maxTickets: 10,
};

export function normalizeRuntimeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const features = source.features && typeof source.features === 'object' ? source.features : {};

  const parsedMaxTickets = Number(source.maxTickets ?? source.limits?.maxTickets);
  const maxTickets = Number.isInteger(parsedMaxTickets) && parsedMaxTickets > 0
    ? parsedMaxTickets
    : DEFAULT_RUNTIME_CONFIG.maxTickets;

  const allowLinkBookings = typeof source.allowLinkBookings === 'boolean'
    ? source.allowLinkBookings
    : typeof features.allowLinkBookings === 'boolean'
      ? features.allowLinkBookings
      : DEFAULT_RUNTIME_CONFIG.features.allowLinkBookings;

  return {
    maintenanceMode: typeof source.maintenanceMode === 'boolean'
      ? source.maintenanceMode
      : DEFAULT_RUNTIME_CONFIG.maintenanceMode,
    maintenanceMessage: typeof source.maintenanceMessage === 'string' && source.maintenanceMessage.trim()
      ? source.maintenanceMessage
      : DEFAULT_RUNTIME_CONFIG.maintenanceMessage,
    features: {
      loginEnabled: typeof features.loginEnabled === 'boolean'
        ? features.loginEnabled
        : DEFAULT_RUNTIME_CONFIG.features.loginEnabled,
      bookingEnabled: typeof features.bookingEnabled === 'boolean'
        ? features.bookingEnabled
        : DEFAULT_RUNTIME_CONFIG.features.bookingEnabled,
      allowLinkBookings,
    },
    allowLinkBookings,
    maxTickets,
  };
}
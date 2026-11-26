export interface RuntimeConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  features: {
    loginEnabled: boolean;
    bookingEnabled: boolean;
    allowLinkBookings: boolean;
  };
  limits: {
    maxTickets: number;
  };
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig;
export function normalizeRuntimeConfig(value: unknown): RuntimeConfig;

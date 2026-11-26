import type { ReactElement, ReactNode } from 'react';
import type { RuntimeConfig } from './runtime-config.js';

export interface RuntimeConfigContextValue {
  config: RuntimeConfig;
  isConfigLoading: boolean;
  isOffline: boolean;
  refreshConfig: () => Promise<void>;
}

export function ConfigProvider(props: { children: ReactNode }): ReactElement;
export function useConfig(): RuntimeConfigContextValue;

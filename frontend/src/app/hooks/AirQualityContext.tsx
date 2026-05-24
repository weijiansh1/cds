import { createContext, useContext, ReactNode } from 'react';
import { useAirQuality, AirQualityState } from './useAirQuality';

const AirQualityCtx = createContext<AirQualityState | null>(null);

export function AirQualityProvider({ children }: { children: ReactNode }) {
  const state = useAirQuality();
  return <AirQualityCtx.Provider value={state}>{children}</AirQualityCtx.Provider>;
}

export function useAirQualityCtx(): AirQualityState {
  const ctx = useContext(AirQualityCtx);
  if (!ctx) {
    return { cities: [], series: [], loading: true, error: null, lastUpdate: null };
  }
  return ctx;
}

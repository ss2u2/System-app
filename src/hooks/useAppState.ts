import { useSyncExternalStore } from 'react';
import { store } from '../services/db';
import type { AppState } from '../types';

/**
 * Custom hook to subscribe to slices of the global AppState.
 * Prevents unnecessary re-renders by only triggering updates when the selected slice changes.
 * 
 * Example usage:
 *   const tasks = useAppState(state => state.tasks);
 */
export function useAppState<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}

/**
 * Convenient access to the store dispatcher actions
 */
export const appActions = {
  setState: store.setState,
  getState: store.getState,
};

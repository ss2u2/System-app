import { useAppState, appActions } from './useAppState';
import type { Session } from '../types';

export function useSessions() {
  const sessions = useAppState((state) => state.sessions);

  const setSessions = (newSessions: Session[]) => {
    appActions.setState({ sessions: newSessions });
  };

  return {
    sessions,
    setSessions,
  };
}

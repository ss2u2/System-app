import { useAppState, appActions } from './useAppState';
import type { NotebookEntry } from '../types';

export function useNotebooks() {
  const notebooks = useAppState((state) => state.notebooks);

  const setNotebooks = (newNotebooks: NotebookEntry[]) => {
    appActions.setState({ notebooks: newNotebooks });
  };

  return {
    notebooks,
    setNotebooks,
  };
}

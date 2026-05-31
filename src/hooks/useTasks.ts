import { useAppState, appActions } from './useAppState';
import type { Task, CustomList } from '../types';

export function useTasks() {
  const tasks = useAppState((state) => state.tasks);
  const lists = useAppState((state) => state.lists);

  const setTasks = (newTasks: Task[]) => {
    appActions.setState({ tasks: newTasks });
  };

  const setLists = (newLists: CustomList[]) => {
    appActions.setState({ lists: newLists });
  };

  return {
    tasks,
    lists,
    setTasks,
    setLists,
  };
}

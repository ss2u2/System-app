import { useAppState, appActions } from './useAppState';
import type { WeeklyGoal, MonthlyGoal, StaticGoal } from '../types';

export function useGoals() {
  const weekly = useAppState((state) => state.weekly);
  const monthly = useAppState((state) => state.monthly);
  const staticGoals = useAppState((state) => state.static);

  return {
    weekly,
    monthly,
    staticGoals,
    setWeekly: (weeklyGoals: WeeklyGoal[]) => appActions.setState({ weekly: weeklyGoals }),
    setMonthly: (monthlyGoals: MonthlyGoal[]) => appActions.setState({ monthly: monthlyGoals }),
    setStatic: (staticGoalsList: StaticGoal[]) => appActions.setState({ static: staticGoalsList }),
  };
}

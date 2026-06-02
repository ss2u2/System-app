import { store } from '../services/db';
import { generateSecureNumericId } from './taskHelper';
import type { ActivityLog } from '../types';

/**
 * Logs an activity to the global state when a task or session is toggled.
 */
export function logActivity(
  itemId: number | string,
  itemType: 'session' | 'task',
  action: 'completed' | 'missed',
  name: string
) {
  const state = store.getState();
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  let currentLogs = state.activityLogs || [];

  if (action === 'completed') {
    // Avoid duplicate completions on the same day for the same item
    const exists = currentLogs.some(
      (log) => log.itemId === itemId && log.itemType === itemType && log.date === dateStr && log.action === 'completed'
    );
    if (!exists) {
      const newLog: ActivityLog = {
        id: String(generateSecureNumericId()),
        date: dateStr,
        itemId,
        itemType,
        action,
        name
      };
      store.setState({ activityLogs: [...currentLogs, newLog] });
    }
  } else if (action === 'missed') {
    // If it's being marked un-completed (e.g. toggled off), remove the 'completed' log for today
    // Or we explicitly log 'missed' if it's the end of the day. 
    // Here we assume if 'action' is 'missed' and it's triggered manually, it's an un-toggle.
    const updatedLogs = currentLogs.filter(
      (log) => !(log.itemId === itemId && log.itemType === itemType && log.date === dateStr && log.action === 'completed')
    );
    
    // If we want to actively log a 'missed' state (e.g. at end of day)
    // we could push a missed log. For toggling off, removing the completed log is sufficient.
    store.setState({ activityLogs: updatedLogs });
  }
}

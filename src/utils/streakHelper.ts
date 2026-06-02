import type { Session } from '../types';

/**
 * Calculates the new streak for a session based on its schedule.
 * If the session is scheduled for Mon, Wed, Fri and it was last completed on Mon,
 * completing it on Wed should increment the streak.
 * Completing it on Tue (an unscheduled day) should also increment it (or keep it alive).
 * Missing it on Wed (scheduled day) should break it.
 * 
 * For simplicity in calculation at completion time:
 * We count how many *scheduled* days have passed since `lastCompletedDate`.
 * If 1 scheduled day has passed, or 0 (completed early), streak increments/maintains.
 * If >1 scheduled days have passed, streak breaks.
 */
export function calculateNewSessionStreak(session: Session, todayStr: string): number {
  const lastStr = session.lastCompletedDate;
  if (!lastStr) return 1;

  const today = new Date(todayStr);
  const last = new Date(lastStr);
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);

  if (today.getTime() === last.getTime()) {
    return session.streak || 1; // Already completed today
  }

  // If daily or none, every day is a scheduled day
  const isDaily = !session.repeatType || session.repeatType === 'daily';
  const repeatDays = session.repeatDays || [0, 1, 2, 3, 4, 5, 6];

  let scheduledDaysPassed = 0;
  
  // Count scheduled days between lastDate (exclusive) and today (inclusive)
  let curr = new Date(last);
  curr.setDate(curr.getDate() + 1);

  while (curr.getTime() <= today.getTime()) {
    const dayOfWeek = curr.getDay();
    if (isDaily || repeatDays.includes(dayOfWeek)) {
      scheduledDaysPassed++;
    }
    curr.setDate(curr.getDate() + 1);
  }

  // If exactly 1 scheduled day has passed (which is today), or 0 (doing it on an unscheduled day early)
  if (scheduledDaysPassed <= 1) {
    return (session.streak || 0) + 1;
  } else {
    // Missed at least one scheduled day
    return 1;
  }
}

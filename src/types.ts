export interface Step {
  name: string;
  type?: 'timer' | 'counter' | 'checklist';
  dur?: string;            // duration in minutes (e.g., "5")
  targetCount?: number;     // for counters (e.g., 100)
  currentCount?: number;    // tracks reps completed
  done: boolean;
  taskId?: number | string; // linked general task ID
}

export interface Session {
  id: number | string;
  name: string;
  icon: string;
  color: string;
  steps: Step[];
  open: boolean;
  streak?: number;
  lastCompletedDate?: string;
  repeatType?: 'daily' | 'weekly';
  repeatDays?: number[]; // Days of the week: 0 = Sun, 1 = Mon, ..., 6 = Sat
}

export interface Task {
  id: number | string;
  name: string;
  cat: string;
  done: boolean;
  listId?: number | string | null;
  starred?: boolean;
  createdAt?: number;
  date?: string;
  time?: string;
  repeatType?: string;
  repeatValue?: string;
  deadline?: string;
  details?: string;
  subtasks?: SubTask[];
  orderIndex?: number;
}

export interface NotebookEntry {
  id: number | string;
  title: string;
  content: string; // HTML content string
  bookmarked?: boolean;
  location?: string;
  images?: string[];
  created_at?: string;
  updated_at?: string;
  draft?: boolean;
  themeColor?: string;
  themePattern?: string;
}

export interface ActivityLog {
  id: string;
  date: string; // YYYY-MM-DD
  itemId: number | string;
  itemType: 'session' | 'task';
  action: 'completed' | 'missed';
  name: string;
}

export interface DeletedIds {
  tasks: (number | string)[];
  sessions: (number | string)[];
  notebooks: (number | string)[];
  lists: (number | string)[];
  activityLogs: (number | string)[];
}

export interface AppState {
  sessions: Session[];
  tasks: Task[];
  lists: CustomList[];
  notebooks: NotebookEntry[];
  completionHistory: Record<string, number>;
  activityLogs: ActivityLog[];
  streak: number;
  lastActiveDate: string;
  deletedIds: DeletedIds;
  _reset?: boolean;
}

export interface AppStore {
  getState(): AppState;
  setState(newState: Partial<AppState> | { _reset: boolean }, fromRemote?: boolean): void;
  subscribe(listener: (state: AppState) => void): () => void;
}

export interface CustomList {
  id: number | string;
  name: string;
  orderIndex?: number;
}

export interface SubTask {
  id: number | string;
  name: string;
  done: boolean;
}

export interface CustomTask {
  id: number | string;
  listId: number | string;
  name: string;
  done: boolean;
  starred: boolean;
  createdAt: number;
  date?: string;
  time?: string;
  deadline?: string;
  details?: string;
  subtasks?: SubTask[];
  orderIndex?: number;
}





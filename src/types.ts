export interface Step {
  name: string;
  dur: string;
  done: boolean;
}

export interface Session {
  id: number | string;
  name: string;
  icon: string;
  color: string;
  steps: Step[];
  open: boolean;
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

export interface WeeklyGoal {
  id: number | string;
  name: string;
  target: number;
  current: number;
}

export interface MonthlyGoal {
  id: number | string;
  name: string;
  target: number;
  current: number;
}

export interface StaticGoal {
  id: number | string;
  name: string;
  emoji: string;
  note: string;
  cat: string;
  progress: number;
}

export interface DiaryBlock {
  id: string;
  type: string;
  content: string;
  indent: number;
  collapsed?: boolean;
  done?: boolean;
}

export interface DiaryEntry {
  id: number | string;
  title: string;
  content: string; // JSON-stringified DiaryBlock[]
  bookmarked?: boolean;
  location?: string;
  images?: string[];
  created_at?: string;
  draft?: boolean;
}

export interface DeletedIds {
  tasks: (number | string)[];
  sessions: (number | string)[];
  goals: (number | string)[];
  diaries: (number | string)[];
  lists: (number | string)[];
}

export interface AppState {
  sessions: Session[];
  tasks: Task[];
  lists: CustomList[];
  weekly: WeeklyGoal[];
  monthly: MonthlyGoal[];
  static: StaticGoal[];
  diaries: DiaryEntry[];
  completionHistory: Record<string, number>;
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





export interface Step {
  name: string;
  dur: string;
  done: boolean;
}

export interface Session {
  id: number;
  name: string;
  icon: string;
  color: string;
  steps: Step[];
  open: boolean;
}

export interface Task {
  id: number;
  name: string;
  cat: string;
  done: boolean;
}

export interface WeeklyGoal {
  id: number;
  name: string;
  target: number;
  current: number;
}

export interface MonthlyGoal {
  id: number;
  name: string;
  target: number;
  current: number;
}

export interface StaticGoal {
  id: number;
  name: string;
  emoji: string;
  note: string;
  cat: string;
  progress: number;
}

export interface JournalBlock {
  id: string;
  type: string;
  content: string;
  indent: number;
  collapsed?: boolean;
  done?: boolean;
}

export interface JournalEntry {
  id: number;
  title: string;
  content: string; // JSON-stringified JournalBlock[]
}

export interface DeletedIds {
  tasks: number[];
  sessions: number[];
  goals: number[];
  journals: number[];
}

export interface AppState {
  sessions: Session[];
  tasks: Task[];
  weekly: WeeklyGoal[];
  monthly: MonthlyGoal[];
  static: StaticGoal[];
  journals: JournalEntry[];
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
  id: number;
  name: string;
}

export interface SubTask {
  id: number;
  name: string;
  done: boolean;
}

export interface CustomTask {
  id: number;
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
}




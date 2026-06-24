export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  note: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
  task?: {
    id: string;
    title: string;
    project?: {
      id: string;
      workspace?: {
        id: string;
        name: string;
      };
    };
  };
}

export interface TaskTimeStats {
  taskId: string;
  estimatedMinutes: number;
  trackedSeconds: number;
}

export interface ProjectTimeStats {
  projectId: string;
  totalEstimatedMinutes: number;
  totalTrackedSeconds: number;
}

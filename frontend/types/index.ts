export interface ApiResponse<T> {
  data: T;
  meta: {
    trace_id: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: unknown[];
    trace_id: string;
  };
}

export interface Pagination {
  next_cursor: string;
  has_more: boolean;
  limit: number;
}

export interface Objective {
  id: string;
  raw_input: string;
  status: string;
  summary: string;
  constraints: Record<string, unknown>;
  success_criteria: string[];
  confidence: number;
  created_at: string;
}

export interface DashboardData {
  objective: {
    id: string;
    summary: string;
    status: string;
    progress_percent: number;
    current_step: string;
  };
  organization: {
    departments: Array<{
      name: string;
      status: string;
      agent_count: number;
      health_score: number;
    }>;
    health: Record<string, number>;
  };
  plan: Record<string, unknown>;
  pending_decisions: number;
  recent_activity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

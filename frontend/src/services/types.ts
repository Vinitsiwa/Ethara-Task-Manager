export type UserRole = "Admin" | "Member";

export type ItemStatus = "Pending" | "Active" | "Done";

export type ItemPriority = "Low" | "Medium" | "High";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  joined_at: string;
}

export interface Workspace {
  id: number;
  title: string;
  summary: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface Collaborator {
  membership_id: number;
  workspace_id: number;
  user_id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface WorkItem {
  id: number;
  title: string;
  notes: string | null;
  status: ItemStatus;
  priority: ItemPriority;
  assignee_id: number | null;
  workspace_id: number;
  deadline: string | null;
  created_at: string;
}

export interface OverviewStats {
  total_items: number;
  pending_count: number;
  active_count: number;
  done_count: number;
  overdue_count: number;
  high_priority_count: number;
}

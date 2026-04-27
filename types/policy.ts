export type MdrType = "MDR-P" | "MDR-A";
export type KanbanColumn =
  | "policy_defined"
  | "action_planned"
  | "action_implemented"
  | "action_progress"
  | "action_blocked"
  | "outcome_verified";
export type PolicyPriority = "low" | "medium" | "high" | "critical";
export type ActionStatus = "pending" | "in_progress" | "completed" | "overdue";
export type CheckFrequency = "3_days" | "1_week" | "2_weeks" | "1_month";

export const FREQUENCY_LABELS: Record<CheckFrequency, string> = {
  "3_days": "Every 3 Days",
  "1_week": "Every Week",
  "2_weeks": "Every 2 Weeks",
  "1_month": "Every Month",
};

export interface PolicyItem {
  policy_item_id: number;
  company_id: number;
  title: string;
  description: string | null;
  esrs_reference: string | null;
  mdr_type: MdrType;
  kanban_column: KanbanColumn;
  priority: PolicyPriority;
  due_date: string | null;
  assignee: string | null;
  check_frequency: CheckFrequency | null;
  source_document_id: number | null;
  linked_action_id: number | null;
  date: string;
  updated_at: string;
}

export interface PolicyAction {
  policy_action_id: number;
  policy_item_id: number;
  action_title: string;
  action_description: string | null;
  owner: string | null;
  target_date: string | null;
  completion_date: string | null;
  evidence_document_id: number | null;
  outcome_metric: string | null;
  outcome_value: string | null;
  status: ActionStatus;
  date: string;
}

export type PolicyBoard = Record<KanbanColumn, PolicyItem[]>;

export const COLUMN_LABELS: Record<KanbanColumn, string> = {
  policy_defined: "Policy Defined (MDR-P)",
  action_planned: "Action Planned (MDR-A)",
  action_implemented: "Action Implemented (MDR-A)",
  action_progress: "Action in Progress",
  action_blocked: "Action Blocked",
  outcome_verified: "Outcome Verified (MDR-T)",
};

import type { PolicyPriority, KanbanColumn } from "../../types";

export const PRIORITY_COLORS: Record<PolicyPriority, string> = {
  critical: "#a64040",
  high: "#b7791f",
  medium: "#6b7771",
  low: "#9aa5a0",
};

export const PILLAR_COLORS: Record<string, string> = {
  E: "#0f6e56",
  S: "#2a4e82",
  G: "#7c3aed",
};

export const COLUMN_ACCENTS: Record<KanbanColumn, string> = {
  policy_defined: "var(--ink-4)",
  action_planned: "#2a4e82",
  action_implemented: "#0f6e56",
  action_progress: "#b7791f",
  action_blocked: "#a64040",
  outcome_verified: "#7c3aed",
};

export function getPillar(ref: string | null): string {
  if (!ref) return "";
  const m = ref.match(/ESRS\s+([ESG])/i);
  return m ? m[1].toUpperCase() : "";
}

export function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

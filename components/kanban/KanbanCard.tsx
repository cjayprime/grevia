import { useDraggable } from "@dnd-kit/core";
import type { PolicyItem } from "../../types";
import { PRIORITY_COLORS, PILLAR_COLORS, getPillar, initials, isOverdue } from "./utils";

interface KanbanCardProps {
  item: PolicyItem;
  onClick: () => void;
}

export default function KanbanCard({ item, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.policy_item_id,
  });

  const pillar = getPillar(item.esrs_reference);
  const pillarColor = PILLAR_COLORS[pillar] || "var(--ink-3)";
  const overdue = isOverdue(item.due_date);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`pm-card ${isDragging ? "pm-card-dragging" : ""}`}
      onClick={onClick}
    >
      <div className="pm-card-top">
        <span
          className="pm-mdr-chip"
          style={{
            background: item.mdr_type === "MDR-P" ? "var(--forest-soft)" : "var(--sand-soft)",
            color: item.mdr_type === "MDR-P" ? "var(--forest)" : "var(--warn)",
          }}
        >
          {item.mdr_type}
        </span>
        {item.esrs_reference && (
          <span
            className="pm-esrs-badge"
            style={{ background: `${pillarColor}18`, color: pillarColor }}
          >
            {item.esrs_reference}
          </span>
        )}
        <span
          className="pm-priority-dot"
          title={item.priority}
          style={{ background: PRIORITY_COLORS[item.priority] }}
        />
      </div>
      <div className="pm-card-title">{item.title}</div>
      <div className="pm-card-foot">
        {item.due_date && (
          <span
            className="pm-due-date"
            style={{ color: overdue ? "var(--err)" : "var(--ink-3)" }}
          >
            {overdue ? "⚠ " : ""}
            {item.due_date}
          </span>
        )}
        <div className="pm-card-foot-right">
          {item.check_frequency && (
            <span className="pm-freq-badge" title="Check frequency">↺</span>
          )}
          {item.assignee && (
            <span className="pm-avatar pm-avatar-sm">{initials(item.assignee)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

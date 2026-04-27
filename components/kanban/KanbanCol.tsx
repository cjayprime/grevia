import { useDroppable } from "@dnd-kit/core";
import type { PolicyItem, KanbanColumn } from "../../types";
import { COLUMN_LABELS } from "../../types";
import { COLUMN_ACCENTS } from "./utils";
import KanbanCard from "./KanbanCard";

interface KanbanColProps {
  colId: KanbanColumn;
  items: PolicyItem[];
  onCardClick: (item: PolicyItem) => void;
  onAddCard: (col: KanbanColumn) => void;
}

export default function KanbanCol({ colId, items, onCardClick, onAddCard }: KanbanColProps) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  const accent = COLUMN_ACCENTS[colId];

  return (
    <div
      className={`pm-column ${isOver ? "pm-column-over" : ""}`}
      style={{ borderTopColor: accent }}
    >
      <div className="pm-col-head">
        <span className="pm-col-title">{COLUMN_LABELS[colId]}</span>
        <span className="pm-col-count">{items.length}</span>
        <button className="pm-col-add" title="Add card" onClick={() => onAddCard(colId)}>
          +
        </button>
      </div>
      <div ref={setNodeRef} className="pm-col-body">
        {items.map((item) => (
          <KanbanCard
            key={item.policy_item_id}
            item={item}
            onClick={() => onCardClick(item)}
          />
        ))}
        {items.length === 0 && (
          <div className="pm-col-empty">Drop cards here</div>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { API, authFetch, extractError, notifyError } from "../helpers";
import type {
  PolicyItem,
  PolicyAction,
  KanbanColumn,
  PolicyPriority,
  CheckFrequency,
} from "../types";
import { COLUMN_LABELS, FREQUENCY_LABELS } from "../types";

const PRIORITY_COLORS: Record<PolicyPriority, string> = {
  critical: "#a64040",
  high: "#b7791f",
  medium: "#6b7771",
  low: "#9aa5a0",
};

const PILLAR_COLORS: Record<string, string> = {
  E: "#0f6e56",
  S: "#2a4e82",
  G: "#7c3aed",
};

function getPillar(ref: string | null): string {
  if (!ref) return "";
  const m = ref.match(/ESRS\s+([ESG])/i);
  return m ? m[1].toUpperCase() : "";
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const FREQUENCIES: CheckFrequency[] = ["3_days", "1_week", "2_weeks", "1_month"];

interface PolicyDetailProps {
  item: PolicyItem;
  onClose: () => void;
  onUpdate: (updated: PolicyItem) => void;
  onDelete: (id: number) => void;
}

export default function PolicyDetail({
  item,
  onClose,
  onUpdate,
  onDelete,
}: PolicyDetailProps) {
  const [actions, setActions] = useState<PolicyAction[]>([]);
  const [addingAction, setAddingAction] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [saving, setSaving] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(item.description || "");
  const [editAssignee, setEditAssignee] = useState(false);
  const [assigneeDraft, setAssigneeDraft] = useState(item.assignee || "");

  const pillar = useMemo(() => getPillar(item.esrs_reference), [item.esrs_reference]);
  const pillarColor = useMemo(() => PILLAR_COLORS[pillar] || "var(--ink-3)", [pillar]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(
          `${API}/api/v1/policy/${item.policy_item_id}/actions`,
        );
        if (!res.ok) { notifyError(await extractError(res)); return; }
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setActions(data);
      } catch {
        notifyError("Could not load actions");
      }
    })();
    return () => { cancelled = true; };
  }, [item.policy_item_id]);

  const handleMove = useCallback(
    async (column: KanbanColumn) => {
      try {
        const res = await authFetch(
          `${API}/api/v1/policy/${item.policy_item_id}/move`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ column }),
          },
        );
        if (!res.ok) { notifyError(await extractError(res)); return; }
        const data = await res.json();
        onUpdate(data);
      } catch {
        notifyError("Failed to move card");
      }
    },
    [item.policy_item_id, onUpdate],
  );

  const handleSaveDesc = useCallback(async () => {
    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/policy/${item.policy_item_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descDraft }),
      });
      if (!res.ok) { notifyError(await extractError(res)); setSaving(false); return; }
      const data = await res.json();
      onUpdate(data);
      setEditDesc(false);
    } catch {
      notifyError("Failed to save description");
    }
    setSaving(false);
  }, [item.policy_item_id, descDraft, onUpdate]);

  const handleSaveAssignee = useCallback(async () => {
    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/policy/${item.policy_item_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: assigneeDraft }),
      });
      if (!res.ok) { notifyError(await extractError(res)); setSaving(false); return; }
      const data = await res.json();
      onUpdate(data);
      setEditAssignee(false);
    } catch {
      notifyError("Failed to save assignee");
    }
    setSaving(false);
  }, [item.policy_item_id, assigneeDraft, onUpdate]);

  const handleChangePriority = useCallback(
    async (priority: PolicyPriority) => {
      try {
        const res = await authFetch(`${API}/api/v1/policy/${item.policy_item_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority }),
        });
        if (!res.ok) { notifyError(await extractError(res)); return; }
        const data = await res.json();
        onUpdate(data);
      } catch {
        notifyError("Failed to update priority");
      }
    },
    [item.policy_item_id, onUpdate],
  );

  const handleChangeFrequency = useCallback(
    async (check_frequency: CheckFrequency | null) => {
      try {
        const res = await authFetch(`${API}/api/v1/policy/${item.policy_item_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check_frequency }),
        });
        if (!res.ok) { notifyError(await extractError(res)); return; }
        const data = await res.json();
        onUpdate(data);
      } catch {
        notifyError("Failed to update frequency");
      }
    },
    [item.policy_item_id, onUpdate],
  );

  const handleAddAction = useCallback(async () => {
    if (!actionTitle.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/policy/${item.policy_item_id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_title: actionTitle, owner: actionOwner || null }),
      });
      if (!res.ok) { notifyError(await extractError(res)); setSaving(false); return; }
      const data = await res.json();
      setActions((prev) => [...prev, data]);
      setActionTitle("");
      setActionOwner("");
      setAddingAction(false);
    } catch {
      notifyError("Failed to add action");
    }
    setSaving(false);
  }, [item.policy_item_id, actionTitle, actionOwner]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      const res = await authFetch(`${API}/api/v1/policy/${item.policy_item_id}`, { method: "DELETE" });
      if (!res.ok) { notifyError(await extractError(res)); return; }
      onDelete(item.policy_item_id);
      onClose();
    } catch {
      notifyError("Failed to delete item");
    }
  }, [item.policy_item_id, item.title, onDelete, onClose]);

  const isOverdue = useMemo(() => {
    if (!item.due_date) return false;
    return new Date(item.due_date) < new Date();
  }, [item.due_date]);

  return (
    <>
      <div className="pm-drawer-backdrop" onClick={onClose} />
      <aside className="pm-drawer">
        <div className="pm-drawer-head">
          <div className="pm-drawer-title-row">
            <span
              className="pm-mdr-chip"
              style={{
                background:
                  item.mdr_type === "MDR-P"
                    ? "var(--forest-soft)"
                    : "var(--sand-soft)",
                color:
                  item.mdr_type === "MDR-P" ? "var(--forest)" : "var(--warn)",
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
          </div>
          <h3 className="pm-drawer-name">{item.title}</h3>
          <div className="pm-drawer-meta">
            <span
              className="pm-priority-dot"
              style={{ background: PRIORITY_COLORS[item.priority] }}
            />
            <select
              className="pm-inline-select"
              value={item.priority}
              onChange={(e) =>
                handleChangePriority(e.target.value as PolicyPriority)
              }
            >
              {(["critical", "high", "medium", "low"] as PolicyPriority[]).map(
                (p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ),
              )}
            </select>
            {item.due_date && (
              <span
                className="pm-due-date"
                style={{ color: isOverdue ? "var(--err)" : "var(--ink-3)" }}
              >
                Due {item.due_date}
                {isOverdue && " (overdue)"}
              </span>
            )}
          </div>
          <button className="modal-close pm-drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="pm-drawer-body">
          {/* Description */}
          <div className="pm-drawer-section">
            <div className="pm-section-label">
              Description
              <button
                className="pm-edit-link"
                onClick={() => setEditDesc(true)}
              >
                Edit
              </button>
            </div>
            {editDesc ? (
              <div className="pm-edit-field">
                <textarea
                  className="pm-textarea"
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  rows={5}
                />
                <div className="pm-edit-actions">
                  <button
                    className="hs-btn primary"
                    onClick={handleSaveDesc}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    className="hs-btn"
                    onClick={() => setEditDesc(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="pm-desc-text">
                {item.description || (
                  <span style={{ color: "var(--ink-3)" }}>No description</span>
                )}
              </p>
            )}
          </div>

          {/* Move column */}
          <div className="pm-drawer-section">
            <div className="pm-section-label">Stage</div>
            <div className="pm-column-pills">
              {(
                [
                  "policy_defined",
                  "action_planned",
                  "action_implemented",
                  "outcome_verified",
                ] as KanbanColumn[]
              ).map((col) => (
                <button
                  key={col}
                  className={`chip ${item.kanban_column === col ? "is-active" : ""}`}
                  onClick={() => handleMove(col)}
                >
                  {COLUMN_LABELS[col]}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div className="pm-drawer-section">
            <div className="pm-section-label">
              Assignee
              <button
                className="pm-edit-link"
                onClick={() => setEditAssignee(true)}
              >
                Edit
              </button>
            </div>
            {editAssignee ? (
              <div className="pm-edit-field">
                <input
                  className="pm-input"
                  value={assigneeDraft}
                  onChange={(e) => setAssigneeDraft(e.target.value)}
                  placeholder="Full name"
                />
                <div className="pm-edit-actions">
                  <button
                    className="hs-btn primary"
                    onClick={handleSaveAssignee}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    className="hs-btn"
                    onClick={() => setEditAssignee(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="pm-assignee-row">
                <div className="pm-avatar">{initials(item.assignee)}</div>
                <span className="pm-assignee-name">
                  {item.assignee || (
                    <span style={{ color: "var(--ink-3)" }}>Unassigned</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Check frequency */}
          <div className="pm-drawer-section">
            <div className="pm-section-label">Check Frequency</div>
            <div className="pm-freq-pills">
              <button
                className={`chip ${!item.check_frequency ? "is-active" : ""}`}
                onClick={() => handleChangeFrequency(null)}
              >
                None
              </button>
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  className={`chip ${item.check_frequency === f ? "is-active" : ""}`}
                  onClick={() => handleChangeFrequency(f)}
                >
                  {FREQUENCY_LABELS[f]}
                </button>
              ))}
            </div>
            {item.check_frequency && (
              <p className="pm-freq-hint">
                Progress on &ldquo;Action Implemented&rdquo; will be checked {FREQUENCY_LABELS[item.check_frequency].toLowerCase()}.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pm-drawer-section">
            <div className="pm-section-label">
              Linked Actions
              <button
                className="pm-edit-link"
                onClick={() => setAddingAction(true)}
              >
                + Add
              </button>
            </div>
            {actions.length === 0 && !addingAction && (
              <p style={{ color: "var(--ink-3)", fontSize: 13 }}>
                No actions yet
              </p>
            )}
            {actions.map((a) => (
              <div key={a.policy_action_id} className="pm-action-row">
                <span
                  className={`pm-action-status pm-action-${a.status}`}
                />
                <div>
                  <div className="pm-action-title">{a.action_title}</div>
                  {a.owner && (
                    <div className="pm-action-meta">Owner: {a.owner}</div>
                  )}
                </div>
              </div>
            ))}
            {addingAction && (
              <div className="pm-add-action">
                <input
                  className="pm-input"
                  placeholder="Action title"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                />
                <input
                  className="pm-input"
                  placeholder="Owner (optional)"
                  value={actionOwner}
                  onChange={(e) => setActionOwner(e.target.value)}
                />
                <div className="pm-edit-actions">
                  <button
                    className="hs-btn primary"
                    onClick={handleAddAction}
                    disabled={saving || !actionTitle.trim()}
                  >
                    Add Action
                  </button>
                  <button
                    className="hs-btn"
                    onClick={() => setAddingAction(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pm-drawer-footer">
          <button
            className="hs-btn"
            style={{ color: "var(--err)", borderColor: "var(--err)" }}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </aside>
    </>
  );
}

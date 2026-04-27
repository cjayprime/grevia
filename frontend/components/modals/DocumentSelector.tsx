import { useCallback, useMemo, useState } from "react";
import type { Doc } from "../../types";

interface DocumentSelectorProps {
  docs: Doc[];
  onClose: () => void;
  onConfirm: (ids: number[]) => void;
  loading?: boolean;
}

export default function DocumentSelector({
  docs,
  onClose,
  onConfirm,
  loading,
}: DocumentSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === docs.length
        ? new Set()
        : new Set(docs.map((d) => d.hot_store_id)),
    );
  }, [docs]);

  const handleConfirm = useCallback(() => {
    onConfirm([...selected]);
  }, [selected, onConfirm]);

  const allSelected = useMemo(
    () => docs.length > 0 && selected.size === docs.length,
    [docs.length, selected.size],
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal el-doc-selector"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Select Documents To Analyze</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="el-doc-selector-actions">
          <button type="button" className="dm-sources-toggle" onClick={toggleAll}>
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <span className="el-doc-count">
            {selected.size} of {docs.length} selected
          </span>
        </div>

        <div className="el-doc-list">
          {docs.map((d) => {
            const active = selected.has(d.hot_store_id);
            const ext = d.file_type || "OTHER";
            return (
              <button
                key={d.hot_store_id}
                type="button"
                className={`dm-source-card ${active ? "is-selected" : ""}`}
                onClick={() => toggle(d.hot_store_id)}
              >
                <span className="dm-source-check">
                  {active ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--forest)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span className="dm-source-check-empty" />
                  )}
                </span>
                <span className={`dm-source-ext ext-${ext.toLowerCase()}`}>
                  {ext}
                </span>
                <span className="dm-source-name" title={d.original_filename}>
                  {d.original_filename}
                </span>
              </button>
            );
          })}
        </div>

        <div className="el-doc-selector-footer">
          <button className="hs-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="hs-btn primary"
            disabled={selected.size === 0 || loading}
            onClick={handleConfirm}
          >
            {loading
              ? "Analyzing…"
              : `Analyze ${selected.size} Document${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

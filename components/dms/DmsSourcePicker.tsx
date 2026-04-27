import { useCallback, useMemo } from "react";
import type { Doc } from "../../types";
import { Empty } from "../index";

interface Props {
  docs: Doc[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onSetAll: (ids: Set<number>) => void;
  onUpload: () => void;
}

export default function DmsSourcePicker({ docs, selectedIds, onToggle, onSetAll, onUpload }: Props) {
  const allSelected = useMemo(() => docs.length > 0 && selectedIds.size === docs.length, [docs, selectedIds]);

  const toggleAll = useCallback(() => {
    onSetAll(allSelected ? new Set() : new Set(docs.map((d) => d.hot_store_id)));
  }, [allSelected, docs, onSetAll]);

  return (
    <section className="dm-sources">
      <div className="dm-sources-head">
        <div className="dm-sources-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>Source Documents</span>
          {selectedIds.size > 0 && <span className="dm-sources-badge">{selectedIds.size}</span>}
        </div>
        <div className="dm-sources-actions">
          {docs.length > 0 && (
            <button type="button" className="dm-sources-toggle" onClick={toggleAll}>
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          )}
          <button type="button" className="dm-sources-upload-btn" onClick={onUpload}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Upload
          </button>
        </div>
      </div>

      {docs.length > 0 ? (
        <div className="dm-sources-grid">
          {docs.map((d) => {
            const active = selectedIds.has(d.hot_store_id);
            const ext = d.file_type || "OTHER";
            return (
              <button
                key={d.hot_store_id}
                type="button"
                className={`dm-source-card ${active ? "is-selected" : ""}`}
                onClick={() => onToggle(d.hot_store_id)}
              >
                <span className="dm-source-check">
                  {active ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span className="dm-source-check-empty" />
                  )}
                </span>
                <span className={`dm-source-ext ext-${ext.toLowerCase()}`}>{ext}</span>
                <span className="dm-source-name" title={d.original_filename}>{d.original_filename}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="dm-sources-empty">
          <Empty
            icon={
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="6" width="32" height="36" rx="4" stroke="var(--rule)" strokeWidth="2" />
                <path d="M16 18h16M16 24h10M16 30h14" stroke="var(--rule)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="36" cy="36" r="10" fill="var(--panel)" stroke="var(--rule)" strokeWidth="2" />
                <path d="M33 36h6M36 33v6" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            title="No documents yet"
            description="Upload files to the Hot Store first, then select them here as source data for your assessment."
          />
        </div>
      )}
    </section>
  );
}

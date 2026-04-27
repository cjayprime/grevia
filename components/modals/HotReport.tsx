import { useCallback, useEffect, useMemo, useState } from "react";
import {
  API,
  authFetch,
  formatBytes,
  FILE_ICONS,
  extractError,
  notifyError,
  notifySuccess,
} from "../../helpers";
import { useCompany } from "../../context/CompanyContext";
import type { ListResponse, Doc } from "../../types";

interface HotReportProps {
  onClose: () => void;
  onDone: () => void;
}

export default function HotReport({ onClose, onDone }: HotReportProps) {
  const { companyId } = useCompany();
  const [allDocs, setAllDocs] = useState<Doc[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(
          `${API}/api/v1/hot-store/documents?limit=100&is_hot_report=false`,
        );
        if (!res.ok) {
          notifyError(await extractError(res));
          return;
        }
        const data: ListResponse = await res.json();
        setAllDocs(data.documents);
      } catch {
        notifyError("Could not load documents");
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      allDocs.filter((d) =>
        d.original_filename.toLowerCase().includes(search.toLowerCase()),
      ),
    [allDocs, search],
  );

  const toggleAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.hot_store_id)));
    }
  }, [selected.size, filtered]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const generate = useCallback(async () => {
    if (!companyId) return;
    setGenerating(true);
    try {
      const res = await authFetch(`${API}/api/v1/hot-store/hot-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          prompt,
          hot_store_ids: [...selected],
        }),
      });
      if (!res.ok) {
        notifyError(await extractError(res));
        setGenerating(false);
        return;
      }
      notifySuccess("Report generated successfully");
      onDone();
    } catch {
      notifyError("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }, [companyId, prompt, selected, onDone]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal hs-hotreport-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Generate Hot Report</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="hs-hr-search">
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hs-search-input"
          />
        </div>

        <div className="hs-hr-list">
          <label className="hs-hr-row header">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleAll}
            />
            <span>Select All ({filtered.length})</span>
          </label>
          {filtered.map((d) => {
            const info = FILE_ICONS[d.file_type] || FILE_ICONS.OTHER;
            return (
              <label
                key={d.hot_store_id}
                className={`hs-hr-row ${selected.has(d.hot_store_id) ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(d.hot_store_id)}
                  onChange={() => toggle(d.hot_store_id)}
                />
                <span className="hs-hr-icon">{info.icon}</span>
                <span className="hs-hr-name">{d.original_filename}</span>
                <span className="hs-hr-size">{formatBytes(d.file_size)}</span>
              </label>
            );
          })}
          {filtered.length === 0 && (
            <div className="hs-hr-empty">
              No documents found. Upload files first.
            </div>
          )}
        </div>

        <textarea
          className="hs-hr-prompt"
          placeholder={
            "Describe the report you want to generate…\n\ne.g. Generate a breakdown of emissions from expenses with percentages and charts"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />

        <div className="hs-hr-footer">
          <span className="hs-hr-count">
            {selected.size} document{selected.size !== 1 ? "s" : ""} selected
          </span>
          <button
            className="hs-btn primary"
            disabled={!selected.size || !prompt.trim() || generating}
            onClick={generate}
          >
            {generating ? (
              <>
                <span className="hs-spinner" />
                Generating…
              </>
            ) : (
              "Generate Report"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

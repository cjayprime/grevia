import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { API, authFetch } from "../../helpers";
import { useCompany } from "../../context/CompanyContext";
import type { MaterialityAssessment } from "../../types";

interface AssessmentHistoryProps {
  workspaceId: number;
  onClose: () => void;
  onSelect: (assessment: MaterialityAssessment) => void;
}

export default function AssessmentHistory({
  workspaceId,
  onClose,
  onSelect,
}: AssessmentHistoryProps) {
  const router = useRouter();
  const { companyId } = useCompany();
  const [assessments, setAssessments] = useState<MaterialityAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [docNames, setDocNames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(
          `${API}/api/v1/materiality?company_id=${companyId}&workspace_id=${workspaceId}`,
        );
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setAssessments(data);
      } catch {
        /* offline */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, companyId]);

  const allDocIds = useMemo(() => {
    const ids = new Set<number>();
    for (const a of assessments) {
      if (a.hot_store_ids) {
        for (const id of a.hot_store_ids) ids.add(id);
      }
    }
    return ids;
  }, [assessments]);

  useEffect(() => {
    if (allDocIds.size === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`${API}/api/v1/hot-store/documents?limit=500`);
        const data = await res.json();
        if (!cancelled && data.documents) {
          const map: Record<number, string> = {};
          for (const d of data.documents) {
            if (allDocIds.has(d.hot_store_id)) {
              map[d.hot_store_id] = d.original_filename;
            }
          }
          setDocNames(map);
        }
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allDocIds]);

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const topicCount = useMemo(
    () =>
      assessments.map((a) => (a.assessment_data ? a.assessment_data.length : 0)),
    [assessments],
  );

  const docSummary = useCallback(
    (ids: number[] | null): string => {
      if (!ids || ids.length === 0) return "No documents";
      const names = ids
        .slice(0, 5)
        .map((id) => docNames[id] || `#${id}`);
      const label = names.join(", ");
      if (ids.length > 5) return `${label} +${ids.length - 5} more`;
      return label;
    },
    [docNames],
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal dm-history-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Assessment History</h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="dm-history-body">
          {loading ? (
            <div className="dm-history-loading">Loading assessments…</div>
          ) : assessments.length === 0 ? (
            <div className="dm-history-empty">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-4)"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p>No assessments yet for this workspace.</p>
            </div>
          ) : (
            <div className="dm-history-list">
              {assessments.map((a, i) => (
                <button
                  key={a.materiality_assessment_id}
                  type="button"
                  className="dm-history-item"
                  onClick={() => {
                    onClose();
                    router.push(`/double-materiality/${a.materiality_assessment_id}`);
                  }}
                >
                  <div className="dm-history-item-left">
                    <span className="dm-history-item-num">
                      #{assessments.length - i}
                    </span>
                    <div className="dm-history-item-info">
                      <strong>
                        {a.standard} Assessment
                      </strong>
                      <span className="dm-history-item-docs">
                        {docSummary(a.hot_store_ids)} · {topicCount[i]} topics
                      </span>
                    </div>
                  </div>
                  <div className="dm-history-item-right">
                    <span className="dm-history-item-date">
                      {formatDate(a.date)}
                    </span>
                    <span
                      className="dm-history-item-status"
                      data-status={a.status}
                    >
                      {a.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

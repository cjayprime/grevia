import { useCallback, useEffect, useMemo, useState } from "react";
import type { MaterialityBreakdown } from "../types";
import React from "react";

const TOPIC_COLORS: Record<string, string> = {
  Environment: "var(--forest)",
  Social: "#2a4e82",
  Governance: "#e5a24a",
};

const TOPIC_HEX: Record<string, string> = {
  Environment: "#0f6e56",
  Social: "#2a4e82",
  Governance: "#e5a24a",
};

interface Props {
  breakdowns: MaterialityBreakdown[];
  highlight?: string | null;
  page?: number;
  totalItems?: number;
  pageSize?: number;
  loading?: boolean;
  onPageChange?: (page: number) => void;
  onTopicFilter?: (topic: string) => void;
}

export default function BreakdownTable({
  breakdowns,
  highlight,
  page = 1,
  totalItems = 0,
  pageSize = 10,
  loading = false,
  onPageChange,
  onTopicFilter,
}: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [manualFilter, setManualFilter] = useState<string>("all");
  const [modalBd, setModalBd] = useState<MaterialityBreakdown | null>(null);

  const openModal = useCallback(
    (e: React.MouseEvent, bd: MaterialityBreakdown) => {
      e.stopPropagation();
      setModalBd(bd);
    },
    [],
  );

  const closeModal = useCallback(() => setModalBd(null), []);

  useEffect(() => {
    if (!modalBd) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalBd(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalBd]);

  const activeFilter = highlight ?? manualFilter;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize],
  );

  const handleFilter = useCallback(
    (t: string) => {
      setManualFilter(t);
      onTopicFilter?.(t);
    },
    [onTopicFilter],
  );

  const displayRows = useMemo(() => {
    let rows = breakdowns;
    if (!onTopicFilter && activeFilter !== "all") {
      rows = rows.filter((b) => b.topic === activeFilter);
    }
    if (!onPageChange) {
      return [...rows].sort((a, b) => {
        const aHas = a.description && a.description.trim().length > 0 ? 1 : 0;
        const bHas = b.description && b.description.trim().length > 0 ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        return (
          Math.max(b.financial_materiality_score, b.impact_materiality_score) -
          Math.max(a.financial_materiality_score, a.impact_materiality_score)
        );
      });
    }
    return rows;
  }, [breakdowns, activeFilter, onTopicFilter, onPageChange]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // if (breakdowns.length === 0 && !loading) return null;

  return (
    <div className="bd-section">
      <div className="sec-head" style={{ marginTop: 32 }}>
        <div className="sec-title">
          <span className="num">02</span>ESRS Disclosure Breakdown
        </div>
        <div className="bd-filters">
          {["all", "Environment", "Social", "Governance"].map((t) => (
            <button
              key={t}
              className={`chip ${activeFilter === t ? "is-active" : ""}`}
              onClick={() => handleFilter(t)}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th style={{ width: 80 }}>DR</th>
              <th>Topic</th>
              <th style={{ width: 150 }}>Sub-topic</th>
              <th className="num" style={{ width: 90 }}>
                Financial
              </th>
              <th className="num" style={{ width: 90 }}>
                Impact
              </th>
              <th>Metric</th>
              <th style={{ width: 100 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((bd) => {
              const expanded =
                expandedId === bd.materiality_assessment_breakdown_id;
              const hasEvidence =
                bd.description && bd.description.trim().length > 0;
              return (
                <React.Fragment key={bd.materiality_assessment_breakdown_id}>
                  <tr
                    className={`${expanded ? "is-selected" : ""} ${!hasEvidence ? "is-flagged" : ""}`}
                    onClick={() =>
                      toggleExpand(bd.materiality_assessment_breakdown_id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span
                        className="bd-expand-icon"
                        style={{
                          display: "inline-block",
                          transform: expanded ? "rotate(90deg)" : "rotate(0)",
                          transition: "transform 0.15s",
                        }}
                      >
                        ▶
                      </span>
                    </td>
                    <td>
                      <span className="scope-tag scope-1">
                        {bd.disclosure_requirement}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          color: TOPIC_COLORS[bd.topic] || "var(--ink)",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {bd.topic}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{bd.sub_topic}</td>
                    <td className="tnum">
                      {bd.financial_materiality_score.toFixed(1)}
                    </td>
                    <td className="tnum">
                      {bd.impact_materiality_score.toFixed(1)}
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        color: "var(--ink-3)",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {bd.metric_description || "—"}
                    </td>
                    <td>
                      <span
                        className="dm-confidence-badge dm-status-clickable"
                        style={{
                          color: hasEvidence ? "var(--ok)" : "var(--warn)",
                        }}
                        onClick={(e) => openModal(e, bd)}
                      >
                        {hasEvidence ? "Evidenced" : "Gap"}
                      </span>
                    </td>
                  </tr>
                  {expanded && (
                    <tr
                      key={`${bd.materiality_assessment_breakdown_id}-detail`}
                    >
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div className="bd-detail">
                          {bd.description && (
                            <div className="bd-detail-section">
                              <h4>Evidence from Documents</h4>
                              <p>{bd.description}</p>
                            </div>
                          )}
                          {bd.impact_risk_opportunities && (
                            <div className="bd-detail-section">
                              <h4>Impact, Risks & Opportunities</h4>
                              <p>{bd.impact_risk_opportunities}</p>
                            </div>
                          )}
                          {bd.policies.length > 0 && (
                            <div className="bd-detail-section">
                              <h4>Policies</h4>
                              <ul>
                                {bd.policies.map((p, i) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {bd.processes.length > 0 && (
                            <div className="bd-detail-section">
                              <h4>Processes (ESRS 2)</h4>
                              <ul>
                                {bd.processes.map((p, i) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {bd.strategies.length > 0 && (
                            <div className="bd-detail-section">
                              <h4>Strategies</h4>
                              <ul>
                                {bd.strategies.map((s, i) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {bd.metric_description && (
                            <div className="bd-detail-section">
                              <h4>Metric</h4>
                              <p>
                                {bd.metric_description}
                                {bd.metric_target > 0 && (
                                  <>
                                    {" "}
                                    — Target: {bd.metric_target}{" "}
                                    {bd.metric_unit}
                                  </>
                                )}
                              </p>
                            </div>
                          )}
                          {bd.recommendations && (
                            <div className="bd-detail-section bd-recommendations">
                              <h4>Recommendations</h4>
                              <p>{bd.recommendations}</p>
                            </div>
                          )}
                          <div className="bd-detail-scores">
                            <div className="bd-score-pill">
                              <span>Financial</span>
                              <strong>
                                {bd.financial_materiality_score.toFixed(1)}
                              </strong>
                            </div>
                            <div className="bd-score-pill">
                              <span>Impact</span>
                              <strong>
                                {bd.impact_materiality_score.toFixed(1)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {loading && <div className="bd-table-loading">Loading…</div>}
      </div>

      {totalItems > 0 && (
        <div className="bd-pagination">
          <button
            className="bd-page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            ← Prev
          </button>
          <span className="bd-page-info">
            Page {page} of {totalPages}
            <span className="bd-page-total"> · {totalItems} items</span>
          </span>
          <button
            className="bd-page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {modalBd && (
        <div className="bd-modal-overlay" onClick={closeModal}>
          <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
            <button className="bd-modal-close" onClick={closeModal}>
              ×
            </button>
            <div className="bd-modal-header">
              <span
                className="bd-modal-dr"
                style={{
                  background: TOPIC_HEX[modalBd.topic] || "#666",
                  color: "#fff",
                }}
              >
                {modalBd.disclosure_requirement}
              </span>
              <div className="bd-modal-title-wrap">
                <h3 className="bd-modal-topic">
                  {modalBd.topic} — {modalBd.sub_topic}
                </h3>
                <div className="bd-modal-scores">
                  <span>
                    Financial{" "}
                    <strong>
                      {modalBd.financial_materiality_score.toFixed(1)}
                    </strong>
                  </span>
                  <span>
                    Impact{" "}
                    <strong>
                      {modalBd.impact_materiality_score.toFixed(1)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="bd-modal-body">
              {modalBd.description ? (
                <div className="bd-modal-section">
                  <h4>Evidence from Documents</h4>
                  <p>{modalBd.description}</p>
                </div>
              ) : (
                <div className="bd-modal-section bd-modal-gap">
                  <h4>Gap Identified</h4>
                  <p>
                    No evidence was found in the uploaded documents for this
                    disclosure requirement.
                  </p>
                </div>
              )}

              {modalBd.recommendations && (
                <div className="bd-modal-section bd-modal-recs">
                  <h4>Recommendations</h4>
                  <p>{modalBd.recommendations}</p>
                </div>
              )}

              {modalBd.impact_risk_opportunities && (
                <div className="bd-modal-section">
                  <h4>Impact, Risks & Opportunities</h4>
                  <p>{modalBd.impact_risk_opportunities}</p>
                </div>
              )}

              {modalBd.metric_description && (
                <div className="bd-modal-section">
                  <h4>Metric</h4>
                  <p>
                    {modalBd.metric_description}
                    {modalBd.metric_target > 0 && (
                      <>
                        {" "}
                        — Target: {modalBd.metric_target} {modalBd.metric_unit}
                      </>
                    )}
                  </p>
                </div>
              )}

              {modalBd.policies.length > 0 && (
                <div className="bd-modal-section">
                  <h4>Policies</h4>
                  <ul>
                    {modalBd.policies.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {modalBd.strategies.length > 0 && (
                <div className="bd-modal-section">
                  <h4>Strategies</h4>
                  <ul>
                    {modalBd.strategies.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo } from "react";
import type { MaterialityTopic } from "../../types";

interface TopicDetailProps {
  topic: MaterialityTopic;
  onClose: () => void;
}

export default function TopicDetail({ topic, onClose }: TopicDetailProps) {
  const confidenceColor = useMemo(() => {
    if (topic.confidence === "high") return "var(--ok)";
    if (topic.confidence === "medium") return "var(--warn)";
    return "var(--err)";
  }, [topic.confidence]);

  const totalScore = useMemo(
    () => topic.financial_impact_score + topic.impact_risk_score,
    [topic.financial_impact_score, topic.impact_risk_score],
  );

  const materialityLevel = useMemo(() => {
    if (totalScore >= 15) return { label: "Critical", color: "var(--err)" };
    if (totalScore >= 11) return { label: "High", color: "var(--warn)" };
    if (totalScore >= 7) return { label: "Moderate", color: "var(--ok)" };
    return { label: "Low", color: "var(--ink-4)" };
  }, [totalScore]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal dm-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{topic.name}</h2>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {topic.esrs_reference} · {topic.topic_id}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="dm-detail-body">
          <div className="dm-detail-score-cards">
            <div className="dm-detail-score-card">
              <span className="dm-detail-score-card-label">Financial Impact</span>
              <span className="dm-detail-score-card-value" style={{ color: "#e5a24a" }}>
                {topic.financial_impact_score}<span className="dm-detail-score-card-max">/10</span>
              </span>
              <span className="dm-detail-score-card-bar">
                <span style={{ width: `${topic.financial_impact_score * 10}%`, background: "#e5a24a" }} />
              </span>
            </div>
            <div className="dm-detail-score-card">
              <span className="dm-detail-score-card-label">Impact Risk</span>
              <span className="dm-detail-score-card-value" style={{ color: "var(--forest)" }}>
                {topic.impact_risk_score}<span className="dm-detail-score-card-max">/10</span>
              </span>
              <span className="dm-detail-score-card-bar">
                <span style={{ width: `${topic.impact_risk_score * 10}%`, background: "var(--forest)" }} />
              </span>
            </div>
            <div className="dm-detail-score-card">
              <span className="dm-detail-score-card-label">Materiality Level</span>
              <span className="dm-detail-score-card-value" style={{ color: materialityLevel.color }}>
                {materialityLevel.label}
              </span>
              <span className="dm-detail-score-card-label" style={{ marginTop: 4 }}>
                Combined: {totalScore}/20
              </span>
            </div>
            <div className="dm-detail-score-card">
              <span className="dm-detail-score-card-label">Confidence</span>
              <span className="dm-detail-score-card-value" style={{ color: confidenceColor, textTransform: "capitalize" }}>
                {topic.confidence}
              </span>
            </div>
          </div>

          <div className="dm-detail-section">
            <h4>Justification</h4>
            <p>{topic.justification || topic.description}</p>
          </div>

          <div className="dm-detail-section">
            <h4>Description</h4>
            <p>{topic.description}</p>
          </div>

          <div className="dm-detail-section">
            <h4>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Gap Analysis
            </h4>
            {topic.data_gaps.length > 0 ? (
              <div className="dm-detail-gaps">
                {topic.data_gaps.map((gap, i) => (
                  <div key={i} className="dm-detail-gap-item">
                    <span className="dm-detail-gap-num">{i + 1}</span>
                    <span>{gap}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dm-detail-no-gaps">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                No data gaps identified — assessment data is complete.
              </p>
            )}
          </div>

          <div className="dm-detail-section">
            <h4>Affected Stakeholders</h4>
            <div className="dm-tags">
              {topic.affected_stakeholders.map((s, i) => (
                <span key={i} className="dm-tag">{s}</span>
              ))}
              {topic.affected_stakeholders.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--ink-4)" }}>None identified</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

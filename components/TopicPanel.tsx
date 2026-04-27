import { useMemo } from "react";
import type { MaterialityTopic } from "../types";

interface TopicPanelProps {
  topic: MaterialityTopic;
  onClose: () => void;
}

export default function TopicPanel({ topic, onClose }: TopicPanelProps) {
  const confidenceColor = useMemo(() => {
    if (topic.confidence === "high") return "var(--ok)";
    if (topic.confidence === "medium") return "var(--warn)";
    return "var(--err)";
  }, [topic.confidence]);

  return (
    <div className="dm-panel-overlay" onClick={onClose}>
      <div className="dm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dm-panel-head">
          <div>
            <h3>{topic.name}</h3>
            <span className="dm-panel-ref">{topic.esrs_reference} · {topic.topic_id}</span>
          </div>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>

        <div className="dm-panel-body">
          <div className="dm-panel-scores">
            <div className="dm-score-row">
              <label>Financial Impact</label>
              <div className="dm-score-bar-wrap">
                <div
                  className="dm-score-bar"
                  style={{ width: `${topic.financial_impact_score * 10}%`, background: "#e5a24a" }}
                />
              </div>
              <span className="dm-score-val">{topic.financial_impact_score}/10</span>
            </div>
            <div className="dm-score-row">
              <label>Impact Risk</label>
              <div className="dm-score-bar-wrap">
                <div
                  className="dm-score-bar"
                  style={{ width: `${topic.impact_risk_score * 10}%`, background: "#0f6e56" }}
                />
              </div>
              <span className="dm-score-val">{topic.impact_risk_score}/10</span>
            </div>
          </div>

          <div className="dm-panel-section">
            <h4>Description</h4>
            <p>{topic.description}</p>
          </div>

          <div className="dm-panel-section">
            <h4>Confidence</h4>
            <span className="dm-confidence-badge" style={{ color: confidenceColor }}>
              {topic.confidence}
            </span>
          </div>

          <div className="dm-panel-section">
            <h4>Affected Stakeholders</h4>
            <div className="dm-tags">
              {topic.affected_stakeholders.map((s, i) => (
                <span key={i} className="dm-tag">{s}</span>
              ))}
              {topic.affected_stakeholders.length === 0 && (
                <span className="dm-empty-hint">None identified</span>
              )}
            </div>
          </div>

          <div className="dm-panel-section">
            <h4>Data Gaps</h4>
            {topic.data_gaps.length > 0 ? (
              <ul className="dm-gap-list">
                {topic.data_gaps.map((g, i) => (
                  <li key={i}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {g}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="dm-empty-hint">No data gaps identified</span>
            )}
          </div>

          <button className="hs-btn primary dm-panel-action">
            Add to Policy Mapper
          </button>
        </div>
      </div>
    </div>
  );
}

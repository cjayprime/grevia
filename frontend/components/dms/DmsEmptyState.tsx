interface Props {
  hasDocuments: boolean;
  hasStandard: boolean;
}

export default function DmsEmptyState({ hasDocuments, hasStandard }: Props) {
  return (
    <div className="dm-empty">
      <div className="dm-empty-illustration">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <rect x="10" y="10" width="100" height="100" rx="16" fill="var(--forest-soft)" fillOpacity="0.4" />
          <line x1="10" y1="60" x2="110" y2="60" stroke="var(--forest)" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
          <line x1="60" y1="10" x2="60" y2="110" stroke="var(--forest)" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
          <circle cx="78" cy="32" r="10" fill="var(--forest)" fillOpacity="0.15" stroke="var(--forest)" strokeWidth="1.5" />
          <text x="78" y="36" textAnchor="middle" fill="var(--forest)" fontSize="9" fontWeight="600">E1</text>
          <circle cx="88" cy="24" r="7" fill="var(--forest)" fillOpacity="0.25" stroke="var(--forest)" strokeWidth="1.5" />
          <text x="88" y="27" textAnchor="middle" fill="var(--forest)" fontSize="7" fontWeight="600">E2</text>
          <circle cx="42" cy="38" r="8.5" fill="#2a4e82" fillOpacity="0.15" stroke="#2a4e82" strokeWidth="1.5" />
          <text x="42" y="41" textAnchor="middle" fill="#2a4e82" fontSize="8" fontWeight="600">S1</text>
          <circle cx="72" cy="78" r="6.5" fill="#e5a24a" fillOpacity="0.2" stroke="#e5a24a" strokeWidth="1.5" />
          <text x="72" y="81" textAnchor="middle" fill="#e5a24a" fontSize="7" fontWeight="600">G1</text>
          <circle cx="34" cy="80" r="5" fill="var(--ink-4)" fillOpacity="0.15" stroke="var(--ink-4)" strokeWidth="1.5" />
          <circle cx="52" cy="52" r="9" fill="var(--forest)" fillOpacity="0.2" stroke="var(--forest)" strokeWidth="1.5" />
          <text x="52" y="55" textAnchor="middle" fill="var(--forest)" fontSize="8" fontWeight="600">E3</text>
          <circle cx="92" cy="52" r="5.5" fill="#7c3aed" fillOpacity="0.15" stroke="#7c3aed" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="dm-empty-content">
        <h3>Map your materiality landscape</h3>
        <p>Run a Double Materiality Assessment to identify the ESG topics that matter most to your business and stakeholders.</p>
        <div className="dm-empty-steps">
          <div className={`dm-empty-step ${hasDocuments ? "done" : ""}`}>
            <span className="dm-empty-step-num">1</span>
            <div>
              <strong>Select source documents</strong>
              <span>Choose reports, policies, or financial data above</span>
            </div>
          </div>
          <div className={`dm-empty-step ${hasStandard ? "done" : ""}`}>
            <span className="dm-empty-step-num">2</span>
            <div>
              <strong>Pick a reporting standard</strong>
              <span>ESRS (GRI, SASB, TCFD, and ISSB coming soon)</span>
            </div>
          </div>
          <div className="dm-empty-step">
            <span className="dm-empty-step-num">3</span>
            <div>
              <strong>Run the assessment</strong>
              <span>We score every materialtopic on financial and impact materiality</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

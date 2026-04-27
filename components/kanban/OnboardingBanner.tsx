interface OnboardingBannerProps {
  onDismiss: () => void;
}

export default function OnboardingBanner({ onDismiss }: OnboardingBannerProps) {
  return (
    <div className="pm-banner">
      <div className="pm-banner-illustration">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect x="4"  y="8" width="14" height="64" rx="4" fill="var(--forest-soft)" stroke="var(--forest)" strokeWidth="1.2" strokeOpacity="0.4" />
          <rect x="22" y="8" width="14" height="64" rx="4" fill="var(--sand-soft)"   stroke="var(--sand)"   strokeWidth="1.2" strokeOpacity="0.4" />
          <rect x="40" y="8" width="14" height="64" rx="4" fill="var(--panel-2)"     stroke="var(--rule)"   strokeWidth="1.2" />
          <rect x="58" y="8" width="14" height="64" rx="4" fill="var(--panel-2)"     stroke="var(--rule)"   strokeWidth="1.2" />
          <rect x="7"  y="14" width="8" height="7" rx="2" fill="var(--forest)"  fillOpacity="0.35" />
          <rect x="7"  y="24" width="8" height="7" rx="2" fill="var(--forest)"  fillOpacity="0.2" />
          <rect x="25" y="14" width="8" height="7" rx="2" fill="var(--sand)"    fillOpacity="0.6" />
          <rect x="43" y="14" width="8" height="7" rx="2" fill="var(--ink-4)"   fillOpacity="0.3" />
        </svg>
      </div>
      <div className="pm-banner-content">
        <h3>Build your policy board</h3>
        <p>Upload MDR-P/MDR-A documents and let AI extract all policies and actions. Then drag cards across columns as you implement them.</p>
        <div className="pm-banner-steps">
          <div className="pm-banner-step"><span>1</span> Upload policy documents</div>
          <div className="pm-banner-step"><span>2</span> Extract policies &amp; actions via AI</div>
          <div className="pm-banner-step"><span>3</span> Drag cards to track progress</div>
        </div>
      </div>
      <button className="pm-banner-dismiss" onClick={onDismiss} title="Dismiss">✕</button>
    </div>
  );
}

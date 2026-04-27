interface EmptyProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function Empty({
  icon,
  title,
  description,
  action,
}: EmptyProps) {
  return (
    <div className="dm-onboard">
      <div className="dm-onboard-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>

      {action && (
        <button className="hs-btn primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

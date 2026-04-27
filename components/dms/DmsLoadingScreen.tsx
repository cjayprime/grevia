import type { Standard } from "../../types";

interface Props {
  standard: Standard;
  docCount: number;
  steps: string[];
  streamLabel: string;
  resultId?: number | null;
  resultError?: string;
  onViewAssessment?: () => void;
  onBackToStudio?: () => void;
}

export default function DmsLoadingScreen({
  standard,
  docCount,
  steps,
  resultId,
  resultError,
  onViewAssessment,
  onBackToStudio,
}: Props) {
  const finished = !!resultId || !!resultError;
  const activeIndex = steps.length - 1;

  return (
    <div className="dm-loading-screen">
      <div className="dm-loading-ring">
        {finished ? (
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke={resultError ? "var(--warn)" : "var(--ok)"}
              strokeWidth="3"
            />
            {resultError ? (
              <path
                d="M24 24l16 16M40 24l-16 16"
                stroke="var(--warn)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M20 33l8 8 16-16"
                fill="none"
                stroke="var(--ok)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        ) : (
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="var(--rule)"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="var(--forest)"
              strokeWidth="3"
              strokeDasharray="176"
              strokeDashoffset="132"
              strokeLinecap="round"
              className="dm-ring-spin"
            />
          </svg>
        )}
      </div>

      <h2>
        {finished
          ? resultError
            ? "Assessment Failed"
            : "Assessment Complete"
          : "Running Materiality Assessment"}
      </h2>

      <p className="dm-loading-sub">
        {standard} standards · {docCount} document{docCount !== 1 ? "s" : ""}
      </p>

      <div className="dm-loading-steps">
        {steps.map((step, i) => (
          <div
            key={`${i}-${step}`}
            className={`dm-loading-step ${i < activeIndex ? "done" : ""} ${i === activeIndex ? "active" : ""}`}
          >
            <span className="dm-loading-step-indicator">
              {i < activeIndex ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ok)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : i === activeIndex ? (
                <span className="dm-step-pulse" />
              ) : (
                <span className="dm-step-pending" />
              )}
            </span>
            {step}
          </div>
        ))}
      </div>

      {finished && resultError && (
        <p className="dm-loading-error">{resultError}</p>
      )}

      {finished && (
        <div className="dm-loading-actions">
          {resultId && onViewAssessment ? (
            <button className="dm-loading-action primary" onClick={onViewAssessment}>
              View Assessment
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <button className="dm-loading-action" onClick={onBackToStudio}>
              Go to Studio
            </button>
          )}
        </div>
      )}
    </div>
  );
}

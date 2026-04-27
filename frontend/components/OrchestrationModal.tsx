import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { API, authFetch, notifyError } from "../helpers";
import { useCompany } from "../context/CompanyContext";

interface OrchestrationRequest {
  company_id: number;
  company_name: string;
  industry: string;
  region: string;
  workspace_id: number;
  hot_store_ids: number[];
}

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: StepStatus;
}

const STEP_NODE_MAP: Record<string, number> = {
  research_done: 0,
  ingestion_done: 1,
  emissions_done: 2,
  policy_done: 3,
  complete: 4,
};

const INITIAL_STEPS: Omit<Step, "status">[] = [
  {
    id: "research",
    label: "Research Agent",
    description: "Searching the web for company ESG data and ESRS guidance",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    id: "ingestion",
    label: "Document Ingestion",
    description: "Reading, classifying and summarising uploaded documents",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    id: "emissions",
    label: "Emissions Analysis",
    description: "Extracting and mapping emissions data against ESRS E1 / GRI 305",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2c0 6-6 6-6 12a6 6 0 0 0 12 0c0-6-6-6-6-12z" />
      </svg>
    ),
  },
  {
    id: "policy_gap",
    label: "Policy Gap Analysis",
    description: "Identifying MDR-P / MDR-A items and missing ESRS policy obligations",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: "materiality",
    label: "Materiality Mapping",
    description: "Running double materiality scoring across all ESRS topics",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="7" cy="17" r="2" /><circle cx="17" cy="7" r="2" /><circle cx="17" cy="17" r="2" /><circle cx="7" cy="7" r="2" />
        <line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="17" x2="15" y2="17" />
        <line x1="7" y1="9" x2="7" y2="15" /><line x1="17" y1="9" x2="17" y2="15" />
      </svg>
    ),
  },
];

interface Props {
  onClose: () => void;
}

export default function OrchestrationModal({ onClose }: Props) {
  const router = useRouter();
  const { companyId } = useCompany();
  const [steps, setSteps] = useState<Step[]>(
    INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })),
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const esRef = useRef<EventSource | null>(null);

  const markStep = useCallback((idx: number, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, status } : s)),
    );
  }, []);

  const startAnalysis = useCallback(() => {
    if (running || !companyId) return;
    setRunning(true);
    setDone(false);
    setError(null);
    setActiveStep(0);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));

    const body: OrchestrationRequest = {
      company_id: companyId,
      company_name: "",
      industry: "",
      region: "",
      workspace_id: companyId,
      hot_store_ids: [],
    };

    // Use fetch + ReadableStream for POST SSE
    (async () => {
      try {
        const res = await authFetch(`${API}/api/v1/orchestrate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.body) throw new Error("No response body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Mark first step running
        markStep(0, "running");

        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let event = "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              event = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const data = JSON.parse(line.slice(5).trim());
              if (event === "step") {
                const stepIdx = STEP_NODE_MAP[data.step];
                if (stepIdx !== undefined) {
                  // Mark everything up to stepIdx as done
                  setSteps((prev) =>
                    prev.map((s, i) => {
                      if (i < stepIdx) return { ...s, status: "done" };
                      if (i === stepIdx) return { ...s, status: "done" };
                      if (i === stepIdx + 1) return { ...s, status: "running" };
                      return s;
                    }),
                  );
                  setActiveStep(stepIdx + 1);
                }
              } else if (event === "complete") {
                setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
                setDone(true);
                setRunning(false);
              } else if (event === "error") {
                setError(data.message);
                setRunning(false);
              }
              event = "";
            }
          }
        }
        setRunning(false);
        setDone(true);
        setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        notifyError(msg);
        setRunning(false);
      }
    })();
  }, [running, markStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const completedCount = steps.filter((s) => s.status === "done").length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="orch-overlay" onClick={onClose}>
      <div className="orch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="orch-head">
          <div>
            <div className="eyebrow">AI Pipeline · CSRD · ESRS</div>
            <h2 className="orch-title">Full ESG Analysis</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p className="orch-desc">
          A five-agent pipeline researches your company, ingests documents, extracts
          emissions and policy data, then produces a complete double materiality assessment.
        </p>

        {/* Progress bar */}
        {running && (
          <div className="orch-progress-wrap">
            <div className="orch-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Steps */}
        <div className="orch-steps">
          {steps.map((step, i) => (
            <div key={step.id} className={`orch-step orch-step-${step.status}`}>
              <div className="orch-step-icon">
                {step.status === "done" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : step.status === "running" ? (
                  <span className="orch-spinner" />
                ) : step.status === "error" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <span className="orch-step-num">{i + 1}</span>
                )}
              </div>
              <div className="orch-step-body">
                <div className="orch-step-icon-wrap">{step.icon}</div>
                <div>
                  <div className="orch-step-label">{step.label}</div>
                  <div className="orch-step-desc">{step.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="orch-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Footer */}
        <div className="orch-footer">
          {done ? (
            <div className="orch-done-actions">
              <p className="orch-done-msg">Analysis complete — all results have been saved.</p>
              <div className="orch-done-btns">
                <button className="hs-btn" onClick={() => { onClose(); router.push("/double-materiality"); }}>
                  View Materiality
                </button>
                <button className="hs-btn" onClick={() => { onClose(); router.push("/emissions-ledger"); }}>
                  View Emissions
                </button>
                <button className="hs-btn primary" onClick={() => { onClose(); router.push("/p2a-mapper"); }}>
                  View Policy Board
                </button>
              </div>
            </div>
          ) : (
            <button
              className="hs-btn primary"
              onClick={startAnalysis}
              disabled={running}
            >
              {running ? (
                <>
                  <span className="orch-btn-spinner" />
                  Running Analysis…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Run Full ESG Analysis
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

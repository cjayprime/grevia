import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import type {
  MaterialityAssessment,
  MaterialityBreakdown,
  Standard,
  Doc,
} from "../../types";
import {
  Layout,
  Workspace,
  AssessmentHistory,
  Upload,
  Empty,
} from "../../components";
import {
  DmsLoadingScreen,
  DmsSourcePicker,
  DmsVizSection,
  DmsEmptyState,
} from "../../components/dms";
import {
  API,
  authFetch,
  extractError,
  notifyError,
  notifySuccess,
} from "../../helpers";
import { useCompany } from "../../context/CompanyContext";

const STANDARDS: Standard[] = ["ESRS", "GRI", "SASB", "TCFD", "ISSB"];
const ACTIVE_STANDARDS = new Set<Standard>(["ESRS"]);

export default function DoubleMateriality() {
  const router = useRouter();
  const { companyId, workspaces, workspacesLoading, refreshWorkspaces } =
    useCompany();
  const workspace = useMemo(() => workspaces[0] ?? null, [workspaces]);

  const [wsModalOpen, setWsModalOpen] = useState(false);
  const [standard, setStandard] = useState<Standard>("ESRS");
  const [hotDocs, setHotDocs] = useState<Doc[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());

  const [assessment, setAssessment] = useState<MaterialityAssessment | null>(
    null,
  );
  const [breakdowns, setBreakdowns] = useState<MaterialityBreakdown[]>([]);
  const [assessing, setAssessing] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [streamLabel, setStreamLabel] = useState("");
  const [resultId, setResultId] = useState<number | null>(null);
  const [resultError, setResultError] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(
          `${API}/api/v1/hot-store/documents?limit=100`,
        );
        if (!res.ok) {
          notifyError(await extractError(res));
          return;
        }
        const data = await res.json();
        if (!cancelled) setHotDocs(data.documents || []);
      } catch {
        notifyError("Could not load documents");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(
          `${API}/api/v1/materiality?company_id=${companyId}&workspace_id=${workspace.workspace_id}`,
        );
        if (!res.ok) {
          notifyError(await extractError(res));
          return;
        }
        const list = await res.json();
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          const latest = list[0];
          setAssessment(latest);
          const detailRes = await authFetch(
            `${API}/api/v1/materiality/${latest.materiality_assessment_id}`,
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            if (!cancelled) setBreakdowns(detail.breakdowns || []);
          }
        }
      } catch {
        notifyError("Could not load assessments");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace, companyId]);

  const toggleDoc = useCallback((id: number) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const runAssessment = useCallback(async () => {
    if (!companyId || selectedDocIds.size === 0) return;
    setAssessing(true);
    setLoadingSteps([]);
    setStreamLabel("");
    setBreakdowns([]);
    setResultId(null);
    setResultError("");

    try {
      const res = await authFetch(`${API}/api/v1/materiality/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standard,
          industry: workspace?.industry || "",
          region: workspace?.region || "",
          hot_store_ids: [...selectedDocIds],
          workspace_id: workspace?.workspace_id,
        }),
      });

      if (!res.ok) {
        notifyError(await extractError(res));
        setAssessing(false);
        return;
      }

      const reader = res.body?.getReader();
      console.log("res", res, res.body, reader, !reader);
      if (!reader) {
        notifyError("Streaming not supported");
        setAssessing(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === "step") {
                const label = data.label || data.step || "";
                if (label) {
                  setStreamLabel(label);
                  setLoadingSteps((prev) =>
                    prev.includes(label) ? prev : [...prev, label],
                  );
                }
              } else if (eventType === "substep") {
                setStreamLabel(data.label || "");
              } else if (eventType === "success") {
                notifySuccess("Assessment complete");
                setResultId(data.materiality_assessment_id);
              } else if (eventType === "error") {
                notifyError(data.message || "Pipeline error");
                setResultError(data.message || "Pipeline error");
              }
            } catch {}
          }
        }
      }
    } catch {
      setResultError("Assessment failed — check your connection");
    }
  }, [standard, selectedDocIds, workspace, companyId]);

  const handleExport = useCallback(async () => {
    if (!assessment) return;
    try {
      const res = await authFetch(
        `${API}/api/v1/materiality/${assessment.materiality_assessment_id}/export`,
        { method: "POST" },
      );
      if (!res.ok) {
        notifyError(await extractError(res));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `materiality_${assessment.standard}_${assessment.materiality_assessment_id}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notifyError("Export failed");
    }
  }, [assessment]);

  const handleWsCreated = useCallback(() => {
    refreshWorkspaces();
    setWsModalOpen(false);
  }, [refreshWorkspaces]);

  const handleHistorySelect = useCallback(async (a: MaterialityAssessment) => {
    setAssessment(a);
    setHistoryOpen(false);
    try {
      const res = await authFetch(
        `${API}/api/v1/materiality/${a.materiality_assessment_id}`,
      );
      if (res.ok) setBreakdowns((await res.json()).breakdowns || []);
    } catch {
      /* fallback: no breakdowns */
    }
  }, []);

  const refreshDocs = useCallback(async () => {
    setUploadOpen(false);
    try {
      const res = await authFetch(
        `${API}/api/v1/hot-store/documents?limit=100`,
      );
      if (!res.ok) {
        notifyError(await extractError(res));
        return;
      }
      setHotDocs((await res.json()).documents || []);
    } catch {
      notifyError("Could not refresh documents");
    }
  }, []);

  if (workspacesLoading) {
    return (
      <Layout activeTab="double-materiality">
        <main className="main">
          <div className="hs-loading">Loading workspace…</div>
        </main>
      </Layout>
    );
  }

  if (!workspace) {
    return (
      <Layout activeTab="double-materiality">
        <main className="main">
          <div className="page-head">
            <div>
              <div className="eyebrow">
                Double Materiality Studio · Impact & Financial Materiality ·
                CSRD
              </div>
              <h1 className="page-title">
                Double Materiality <br />
                <em>Studio</em>
              </h1>
              <p className="page-desc">
                Grevia orchestrates a multi-agent pipeline that ingests
                operational data, classifies it against recognised frameworks,
                and produces an auditor-ready report.
              </p>
            </div>
          </div>
          <Empty
            icon={
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect
                  x="4"
                  y="8"
                  width="40"
                  height="32"
                  rx="4"
                  stroke="var(--forest)"
                  strokeWidth="2"
                />
                <rect
                  x="4"
                  y="8"
                  width="40"
                  height="10"
                  rx="4"
                  fill="var(--forest-soft)"
                  stroke="var(--forest)"
                  strokeWidth="2"
                />
                <circle cx="10" cy="13" r="1.5" fill="var(--forest)" />
                <circle cx="15" cy="13" r="1.5" fill="var(--forest)" />
                <circle cx="20" cy="13" r="1.5" fill="var(--forest)" />
                <rect
                  x="10"
                  y="24"
                  width="12"
                  height="2"
                  rx="1"
                  fill="var(--rule)"
                />
                <rect
                  x="10"
                  y="29"
                  width="20"
                  height="2"
                  rx="1"
                  fill="var(--rule)"
                />
                <rect
                  x="10"
                  y="34"
                  width="16"
                  height="2"
                  rx="1"
                  fill="var(--rule)"
                />
                <rect
                  x="32"
                  y="23"
                  width="8"
                  height="8"
                  rx="2"
                  fill="var(--forest-soft)"
                  stroke="var(--forest)"
                  strokeWidth="1.5"
                />
              </svg>
            }
            title="Configure your company workspace"
            description="A workspace stores your company profile, industry context, and stakeholder details — enabling precise materiality scoring."
            action={{
              label: "Create Workspace",
              onClick: () => setWsModalOpen(true),
            }}
          />
          {wsModalOpen && (
            <Workspace
              onClose={() => setWsModalOpen(false)}
              onCreated={handleWsCreated}
            />
          )}
        </main>
      </Layout>
    );
  }

  if (assessing || resultId || resultError) {
    return (
      <Layout activeTab="double-materiality">
        <main className="main">
          <DmsLoadingScreen
            standard={standard}
            docCount={selectedDocIds.size}
            steps={loadingSteps}
            streamLabel={streamLabel}
            resultId={resultId}
            resultError={resultError}
            onViewAssessment={
              resultId
                ? () => router.push(`/double-materiality/${resultId}`)
                : undefined
            }
            onBackToStudio={() => {
              setAssessing(false);
              setResultId(null);
              setResultError("");
            }}
          />
        </main>
      </Layout>
    );
  }

  return (
    <Layout activeTab="double-materiality">
      <main className="main">
        <div className="page-head">
          <div>
            <div className="eyebrow">
              Double Materiality Studio · Impact & Financial Materiality · CSRD
            </div>
            <h1 className="page-title">
              Double Materiality <br />
              <em>Studio</em>
            </h1>
            <p className="page-desc">
              Grevia orchestrates a multi-agent pipeline that ingests
              operational data, classifies it against recognised frameworks, and
              produces an auditor-ready report.
            </p>
          </div>
          {assessment && (
            <div className="head-meta">
              <strong>{breakdowns.length} disclosure requirements</strong>
              {assessment.standard} · {assessment.industry} ·{" "}
              {assessment.region}
            </div>
          )}
        </div>

        {/* Topbar */}
        <div className="hs-topbar">
          <div className="hs-tabs">
            <div className="dm-pill-tabs">
              {STANDARDS.map((s) => {
                const active = ACTIVE_STANDARDS.has(s);
                return (
                  <button
                    key={s}
                    className={`chip ${standard === s ? "is-active" : ""} ${!active ? "chip-soon" : ""}`}
                    onClick={() => active && setStandard(s)}
                    disabled={!active}
                  >
                    {s}
                    {!active && <span className="chip-soon-badge">Soon</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="hs-actions">
            <button className="hs-btn" onClick={() => setHistoryOpen(true)}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              History
            </button>
            <button
              className="hs-btn primary"
              onClick={runAssessment}
              disabled={selectedDocIds.size === 0}
              title={
                selectedDocIds.size === 0
                  ? "Select at least one source document"
                  : ""
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run Assessment
            </button>
          </div>
        </div>

        <DmsSourcePicker
          docs={hotDocs}
          selectedIds={selectedDocIds}
          onToggle={toggleDoc}
          onSetAll={setSelectedDocIds}
          onUpload={() => setUploadOpen(true)}
        />

        {breakdowns.length > 0 ? (
          <>
            <DmsVizSection breakdowns={breakdowns} onExport={handleExport} />

            {assessment && (
              <div className="dm-view-more-wrap">
                <button
                  className="dm-view-more-btn"
                  onClick={() =>
                    router.push(
                      `/double-materiality/${assessment.materiality_assessment_id}`,
                    )
                  }
                >
                  View Full Assessment
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
              </div>
            )}
          </>
        ) : (
          <DmsEmptyState
            hasDocuments={selectedDocIds.size > 0}
            hasStandard={!!standard}
          />
        )}

        {historyOpen && workspace && (
          <AssessmentHistory
            workspaceId={workspace.workspace_id}
            onClose={() => setHistoryOpen(false)}
            onSelect={handleHistorySelect}
          />
        )}

        {uploadOpen && (
          <Upload onClose={() => setUploadOpen(false)} onDone={refreshDocs} />
        )}

        {wsModalOpen && (
          <Workspace
            onClose={() => setWsModalOpen(false)}
            onCreated={handleWsCreated}
          />
        )}
      </main>
    </Layout>
  );
}

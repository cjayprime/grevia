import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Layout, DocumentSelector } from "../components";
import {
  API,
  authFetch,
  extractError,
  notifyError,
  notifySuccess,
} from "../helpers";
import { useCompany } from "../context/CompanyContext";
import type { Doc, EmissionRecord, TimelineBucket } from "../types";

type ScopeFilter = "all" | 1 | 2 | 3;

const SCOPE_COLORS = {
  scope1: "#0f6e56",
  scope2: "#2a4e82",
  scope3: "#e5a24a",
};

const LOADING_STEPS = [
  "Ingesting documents",
  "Classifying emissions",
  "Mapping frameworks",
  "Scoring confidence",
];

export default function EmissionsLedger() {
  const [records, setRecords] = useState<EmissionRecord[]>([]);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [hotDocs, setHotDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  const { companyId, workspaces } = useCompany();

  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [narrativeBusy, setNarrativeBusy] = useState(false);
  const [modalRow, setModalRow] = useState<EmissionRecord | null>(null);
  const [elPage, setElPage] = useState(1);
  const [elTotal, setElTotal] = useState(0);
  const [elLoading, setElLoading] = useState(false);
  const PAGE_SIZE = 10;

  const fetchRecords = useCallback(
    async (page = 1, scope?: ScopeFilter) => {
      if (!companyId) return;
      setElLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (scope && scope !== "all") params.set("scope", String(scope));
        const res = await authFetch(`${API}/api/v1/emissions?${params}`);
        if (!res.ok) {
          notifyError(await extractError(res));
          return;
        }
        const data = await res.json();
        setRecords(data.records || []);
        setElTotal(data.total ?? 0);
        setElPage(data.page ?? page);
      } catch {
        notifyError("Could not load emissions records");
      }
      setElLoading(false);
    },
    [companyId],
  );

  const fetchTimeline = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await authFetch(`${API}/api/v1/emissions/timeline`);
      if (!res.ok) {
        notifyError(await extractError(res));
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setTimeline(data);
    } catch {
      notifyError("Could not load timeline");
    }
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([fetchRecords(), fetchTimeline()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchRecords, fetchTimeline]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(
          `${API}/api/v1/hot-store/documents?limit=100`,
        );
        const data = await res.json();
        if (!cancelled) setHotDocs(data.documents || []);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnalyze = useCallback(
    async (docIds: number[]) => {
      if (!companyId) return;
      setAnalyzing(true);
      setLoadingStep(0);
      const interval = setInterval(() => {
        setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
      }, 3000);

      try {
        const res = await authFetch(`${API}/api/v1/emissions/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: workspaces[0]?.workspace_id,
            hot_store_ids: docIds,
          }),
        });

        if (res.ok) {
          await fetchRecords();
          await fetchTimeline();
          notifySuccess("Analysis complete — new records added");
        } else {
          notifyError(await extractError(res));
        }
      } catch {
        notifyError("Analysis failed — check your connection");
      }

      clearInterval(interval);
      setAnalyzing(false);
      setSelectorOpen(false);
    },
    [companyId, fetchRecords, fetchTimeline, workspaces],
  );

  const handleNarrative = useCallback(async () => {
    if (!companyId) return;
    setNarrativeBusy(true);
    try {
      const res = await authFetch(`${API}/api/v1/emissions/narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaces[0]?.workspace_id }),
      });
      if (res.ok) {
        const data = await res.json();
        notifySuccess(`Narratives generated for ${data.updated || 0} records`);
        await fetchRecords();
      } else {
        notifyError(await extractError(res));
      }
    } catch {
      notifyError("Narrative generation failed");
    }
    setNarrativeBusy(false);
  }, [companyId, workspaces, fetchRecords]);

  const handleScopeFilter = useCallback(
    (s: ScopeFilter) => {
      setScopeFilter(s);
      fetchRecords(1, s);
    },
    [fetchRecords],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      fetchRecords(page, scopeFilter);
    },
    [fetchRecords, scopeFilter],
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(elTotal / PAGE_SIZE)),
    [elTotal],
  );

  const stats = useMemo(() => {
    const total = records.reduce((s, r) => s + (r.tco2e || 0), 0);
    const s1 = records
      .filter((r) => r.scope === 1)
      .reduce((s, r) => s + (r.tco2e || 0), 0);
    const s2 = records
      .filter((r) => r.scope === 2)
      .reduce((s, r) => s + (r.tco2e || 0), 0);
    const s3 = records
      .filter((r) => r.scope === 3)
      .reduce((s, r) => s + (r.tco2e || 0), 0);
    const gaps = records.filter((r) => r.status === "gap").length;
    const outliers = records.filter((r) => r.status === "outlier").length;
    return { total, s1, s2, s3, gaps, outliers };
  }, [records]);

  if (analyzing) {
    return (
      <Layout activeTab="emissions-ledger">
        <main className="main">
          <div className="dm-loading-screen">
            <div className="dm-loading-ring">
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
            </div>
            <h2>Analyzing Emissions Data</h2>
            <p className="dm-loading-sub">Processing uploaded documents</p>
            <div className="dm-loading-steps">
              {LOADING_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`dm-loading-step ${i < loadingStep ? "done" : ""} ${i === loadingStep ? "active" : ""}`}
                >
                  <span className="dm-loading-step-indicator">
                    {i < loadingStep ? (
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
                    ) : i === loadingStep ? (
                      <span className="dm-step-pulse" />
                    ) : (
                      <span className="dm-step-pending" />
                    )}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout activeTab="emissions-ledger">
      <main className="main">
        <div className="page-head">
          <div>
            <div className="eyebrow">
              Emissions Ledger · CSRD · ESRS E1 · FY2025 Disclosure
            </div>
            <h1 className="page-title">
              Your <em>expertly-crafted</em> <br />
              Emissions Ledger,
            </h1>
            <p className="page-desc">
              Grevia orchestrates a three-agent pipeline that ingests
              operational data, classifies it against recognised frameworks, and
              produces an auditor-ready report. You stay in control of every
              line.
            </p>
          </div>
          <div className="head-meta">
            <strong>
              {records.length} emission record{records.length !== 1 ? "s" : ""}
            </strong>
            {stats.gaps > 0 && ` · ${stats.gaps} gaps`}
            {stats.outliers > 0 && ` · ${stats.outliers} outliers`}
          </div>
        </div>

        {/* Top bar actions */}
        <div className="hs-topbar">
          <div className="hs-tabs" />
          <div className="hs-actions">
            <button
              className="hs-btn"
              disabled={narrativeBusy || stats.gaps + stats.outliers === 0}
              onClick={handleNarrative}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
              </svg>
              {narrativeBusy ? "Generating…" : "Generate Narratives"}
            </button>
            <button
              className="hs-btn primary"
              onClick={() => setSelectorOpen(true)}
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
              Analyze Documents
            </button>
          </div>
        </div>

        {/* Summary stats */}

        <>
          <div className="el-stats">
            <div className="el-stat">
              <div className="el-stat-label">Total CO₂e</div>
              <div className="el-stat-value">
                {Math.round(stats.total).toLocaleString()}
                <span className="el-stat-unit">tCO₂e</span>
              </div>
            </div>
            <div className="el-stat el-stat-s1">
              <div className="el-stat-label">Scope 1</div>
              <div className="el-stat-value">
                {Math.round(stats.s1).toLocaleString()}
                <span className="el-stat-unit">tCO₂e</span>
              </div>
            </div>
            <div className="el-stat el-stat-s2">
              <div className="el-stat-label">Scope 2</div>
              <div className="el-stat-value">
                {Math.round(stats.s2).toLocaleString()}
                <span className="el-stat-unit">tCO₂e</span>
              </div>
            </div>
            <div className="el-stat el-stat-s3">
              <div className="el-stat-label">Scope 3</div>
              <div className="el-stat-value">
                {Math.round(stats.s3).toLocaleString()}
                <span className="el-stat-unit">tCO₂e</span>
              </div>
            </div>
            <div className="el-stat el-stat-gap">
              <div className="el-stat-label">Gaps</div>
              <div className="el-stat-value">{stats.gaps}</div>
            </div>
            <div className="el-stat el-stat-outlier">
              <div className="el-stat-label">Outliers</div>
              <div className="el-stat-value">{stats.outliers}</div>
            </div>
          </div>

          {/* Timeline chart */}
          {
            <div className="el-chart-wrap">
              <div className="sec-head">
                <div className="sec-title">
                  <span className="num">01</span>Emissions Timeline
                </div>
              </div>
              <div className="el-chart">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={timeline}>
                    <defs>
                      <linearGradient id="grad-s1" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={SCOPE_COLORS.scope1}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={SCOPE_COLORS.scope1}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                      <linearGradient id="grad-s2" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={SCOPE_COLORS.scope2}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={SCOPE_COLORS.scope2}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                      <linearGradient id="grad-s3" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={SCOPE_COLORS.scope3}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={SCOPE_COLORS.scope3}
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: "var(--ink-3)" }}
                      axisLine={{ stroke: "var(--rule)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--ink-3)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--panel)",
                        border: "1px solid var(--rule)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Area
                      type="monotone"
                      dataKey="scope1"
                      name="Scope 1"
                      stackId="1"
                      stroke={SCOPE_COLORS.scope1}
                      fill="url(#grad-s1)"
                      strokeWidth={2}
                      animationDuration={800}
                    />
                    <Area
                      type="monotone"
                      dataKey="scope2"
                      name="Scope 2"
                      stackId="1"
                      stroke={SCOPE_COLORS.scope2}
                      fill="url(#grad-s2)"
                      strokeWidth={2}
                      animationDuration={800}
                    />
                    <Area
                      type="monotone"
                      dataKey="scope3"
                      name="Scope 3"
                      stackId="1"
                      stroke={SCOPE_COLORS.scope3}
                      fill="url(#grad-s3)"
                      strokeWidth={2}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          }
        </>

        {/* Table section */}
        <div className="sec-head">
          <div className="sec-title">
            <span className="num">{timeline.length > 0 ? "02" : "01"}</span>
            Emissions ledger
          </div>
          <div className="sec-actions table-filters">
            {(["all", 1, 2, 3] as ScopeFilter[]).map((s) => (
              <span
                key={s}
                className={`chip ${scopeFilter === s ? "is-active" : ""}`}
                onClick={() => handleScopeFilter(s)}
              >
                {s === "all" ? "All" : `Scope ${s}`}
              </span>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-head">
            <div>
              <span className="t-title">Category-level emissions</span>
              <span className="t-sub">
                {elTotal} row{elTotal !== 1 ? "s" : ""} · FY
                {records[0]?.year || 2025}
              </span>
            </div>
            <div
              className="mono"
              style={{ fontSize: "11px", color: "var(--ink-3)" }}
            >
              ESRS · GRI · TCFD · ISSB
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "120px" }}>Scope</th>
                <th>Category</th>
                <th className="num">tCO₂e</th>
                <th className="num" style={{ width: "100px" }}>
                  % total
                </th>
                <th style={{ width: "200px" }}>Confidence</th>
                <th style={{ width: "200px" }}>Standards</th>
                <th style={{ width: "140px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 40 }}>
                    <span className="hs-loading">Loading emissions…</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--ink-3)",
                    }}
                  >
                    No emission records yet — click &ldquo;Analyze
                    Documents&rdquo; to get started
                  </td>
                </tr>
              ) : (
                records.map((row) => {
                  const confPct =
                    row.confidence === "high"
                      ? 95
                      : row.confidence === "medium"
                        ? 70
                        : 40;
                  const confCls =
                    row.confidence === "low"
                      ? "low"
                      : row.confidence === "medium"
                        ? "med"
                        : "";
                  const rowCls =
                    row.status === "gap"
                      ? "el-row-gap"
                      : row.status === "outlier"
                        ? "el-row-outlier"
                        : row.status === "ok"
                          ? "el-row-ok"
                          : "";

                  return (
                    <tr key={row.emission_record_id} className={rowCls}>
                      <td>
                        <span className={`scope-tag scope-${row.scope}`}>
                          Scope {row.scope}
                        </span>
                      </td>
                      <td>
                        <div className="cat-name">{row.category}</div>
                        {row.narrative_disclosure && (
                          <div className="cat-sub">
                            {row.narrative_disclosure.length > 80
                              ? row.narrative_disclosure.slice(0, 80) + "…"
                              : row.narrative_disclosure}
                          </div>
                        )}
                      </td>
                      <td className="tnum">
                        {row.tco2e != null
                          ? Math.round(row.tco2e).toLocaleString()
                          : "—"}
                      </td>
                      <td className="tnum">
                        {row.percentage_of_total != null
                          ? `${row.percentage_of_total}%`
                          : "—"}
                      </td>
                      <td>
                        <span className="conf-bar">
                          <span
                            className={`conf-fill ${confCls}`}
                            style={{ width: `${confPct}%` }}
                          />
                        </span>
                        <span className="conf-val">{row.confidence}</span>
                      </td>
                      <td>
                        <div className="el-standards">
                          {row.esrs_reference && (
                            <span className="el-std-chip el-std-esrs">
                              {row.esrs_reference}
                            </span>
                          )}
                          {row.gri_reference && (
                            <span className="el-std-chip el-std-gri">
                              {row.gri_reference}
                            </span>
                          )}
                          {row.tcfd_reference && (
                            <span className="el-std-chip el-std-tcfd">
                              {row.tcfd_reference}
                            </span>
                          )}
                          {row.issb_reference && (
                            <span className="el-std-chip el-std-issb">
                              {row.issb_reference}
                            </span>
                          )}
                          {!row.esrs_reference &&
                            !row.gri_reference &&
                            !row.tcfd_reference &&
                            !row.issb_reference && (
                              <span style={{ color: "var(--ink-4)" }}>—</span>
                            )}
                        </div>
                      </td>
                      <td>
                        <button
                          className="el-status-btn"
                          data-status={row.status}
                          onClick={() => setModalRow(row)}
                        >
                          {row.status === "gap"
                            ? "● Gap"
                            : row.status === "outlier"
                              ? "● Outlier"
                              : row.status === "ok"
                                ? "● OK"
                                : "● Unverified"}
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 4, opacity: 0.6 }}>
                            <path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {elLoading && <div className="bd-table-loading">Loading…</div>}
        </div>

        {elTotal > 0 && (
          <div className="bd-pagination">
            <button
              className="bd-page-btn"
              disabled={elPage <= 1}
              onClick={() => handlePageChange(elPage - 1)}
            >
              ← Prev
            </button>
            <span className="bd-page-info">
              Page {elPage} of {totalPages}
              <span className="bd-page-total"> · {elTotal} items</span>
            </span>
            <button
              className="bd-page-btn"
              disabled={elPage >= totalPages}
              onClick={() => handlePageChange(elPage + 1)}
            >
              Next →
            </button>
          </div>
        )}

        {/* Document selector modal */}
        {selectorOpen && (
          <DocumentSelector
            docs={hotDocs}
            onClose={() => setSelectorOpen(false)}
            onConfirm={handleAnalyze}
            loading={analyzing}
          />
        )}

        {modalRow && (
          <div className="bd-modal-overlay" onClick={() => setModalRow(null)}>
            <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="bd-modal-close"
                onClick={() => setModalRow(null)}
              >
                ×
              </button>
              <div className="bd-modal-header">
                <span
                  className="bd-modal-dr"
                  style={{
                    background:
                      modalRow.status === "gap"
                        ? "var(--warn)"
                        : modalRow.status === "outlier"
                          ? "#e5a24a"
                          : "var(--forest)",
                    color: "#fff",
                  }}
                >
                  Scope {modalRow.scope}
                </span>
                <div className="bd-modal-title-wrap">
                  <h3 className="bd-modal-topic">{modalRow.category}</h3>
                  <div className="bd-modal-scores">
                    <span>
                      {modalRow.tco2e != null
                        ? `${Math.round(modalRow.tco2e).toLocaleString()} tCO₂e`
                        : "No data"}
                    </span>
                    <span>
                      Confidence: <strong>{modalRow.confidence}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bd-modal-body">
                {modalRow.narrative_disclosure ? (
                  <div className="bd-modal-section">
                    <h4>Narrative Disclosure</h4>
                    <p>{modalRow.narrative_disclosure}</p>
                  </div>
                ) : (
                  <div className="bd-modal-section bd-modal-gap">
                    <h4>
                      {modalRow.status === "gap"
                        ? "Data Gap Identified"
                        : modalRow.status === "outlier"
                          ? "Outlier Detected"
                          : "No Narrative Available"}
                    </h4>
                    <p>
                      {modalRow.status === "gap"
                        ? "No emissions data was found for this category. Use 'Generate Narratives' to create a disclosure paragraph explaining the gap."
                        : modalRow.status === "outlier"
                          ? "This value appears anomalous. Use 'Generate Narratives' to produce an explanation for auditors."
                          : "Run 'Generate Narratives' to create a disclosure for this record."}
                    </p>
                  </div>
                )}

                {(modalRow.esrs_reference ||
                  modalRow.gri_reference ||
                  modalRow.tcfd_reference ||
                  modalRow.issb_reference) && (
                  <div className="bd-modal-section">
                    <h4>Standards Mapping</h4>
                    <div className="el-standards" style={{ marginTop: 8 }}>
                      {modalRow.esrs_reference && (
                        <span className="el-std-chip el-std-esrs">
                          {modalRow.esrs_reference}
                        </span>
                      )}
                      {modalRow.gri_reference && (
                        <span className="el-std-chip el-std-gri">
                          {modalRow.gri_reference}
                        </span>
                      )}
                      {modalRow.tcfd_reference && (
                        <span className="el-std-chip el-std-tcfd">
                          {modalRow.tcfd_reference}
                        </span>
                      )}
                      {modalRow.issb_reference && (
                        <span className="el-std-chip el-std-issb">
                          {modalRow.issb_reference}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

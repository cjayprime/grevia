import { useMemo } from "react";
import { Layout } from "../components";

export default function DoubleMateriality() {
  const rows = useMemo(
    () => [
      {
        id: "natgas",
        scope: 1,
        cat: "Natural gas combustion",
        sub: "12 facilities · stationary combustion",
        co2: 18420,
        conf: 0.94,
        flagged: false,
      },
      {
        id: "fleet",
        scope: 1,
        cat: "Company fleet — diesel",
        sub: "284 vehicles · 6.1M km",
        co2: 7830,
        conf: 0.89,
        flagged: false,
      },
      {
        id: "refrigerant",
        scope: 1,
        cat: "Refrigerant leakage",
        sub: "HFC-134a · fugitive",
        co2: 1240,
        conf: 0.71,
        flagged: true,
      },
      {
        id: "electricity",
        scope: 2,
        cat: "Purchased electricity",
        sub: "Grid — market-based",
        co2: 24150,
        conf: 0.97,
        flagged: false,
      },
      {
        id: "steam",
        scope: 2,
        cat: "Purchased steam &amp; heat",
        sub: "3 industrial sites",
        co2: 4870,
        conf: 0.82,
        flagged: false,
      },
      {
        id: "electricity-loc",
        scope: 2,
        cat: "Electricity — location-based",
        sub: "Disclosure only",
        co2: 28390,
        conf: 0.95,
        flagged: false,
      },
      {
        id: "purchased-goods",
        scope: 3,
        cat: "Purchased goods &amp; services",
        sub: "Spend-based · 14 tier-1 suppliers",
        co2: 41820,
        conf: 0.58,
        flagged: true,
      },
      {
        id: "upstream-trans",
        scope: 3,
        cat: "Upstream transportation",
        sub: "Freight · road &amp; sea",
        co2: 12460,
        conf: 0.64,
        flagged: true,
      },
      {
        id: "bizair",
        scope: 3,
        cat: "Business travel — air",
        sub: "2,184 flights · distance-based",
        co2: 3890,
        conf: 0.88,
        flagged: false,
      },
      {
        id: "employees",
        scope: 3,
        cat: "Employee commuting",
        sub: "Survey-extrapolated",
        co2: 2140,
        conf: 0.62,
        flagged: true,
      },
      {
        id: "waste",
        scope: 3,
        cat: "Waste in operations",
        sub: "Weighted-avg method",
        co2: 980,
        conf: 0.74,
        flagged: false,
      },
      {
        id: "use-sold",
        scope: 3,
        cat: "Use of sold products",
        sub: "Lifetime · engineering model",
        co2: 38017,
        conf: 0.55,
        flagged: true,
      },
    ],
    [],
  );

  const table = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.co2, 0);
    return rows.map((row) => {
      const pct = ((row.co2 / total) * 100).toFixed(1);
      const confPct = Math.round(row.conf * 100);
      const confCls = row.conf < 0.65 ? "low" : row.conf < 0.8 ? "med" : "";
      return (
        <tr key={row.id} className={row.flagged ? "is-flagged" : ""}>
          <td>
            <span className={`scope-tag scope-${row.scope}`}>
              Scope {row.scope}
            </span>
          </td>
          <td>
            <div className="cat-name">{row.cat}</div>
            <div className="cat-sub">{row.sub}</div>
          </td>
          <td className="tnum">{row.co2.toLocaleString()}</td>
          <td className="tnum">{pct}%</td>
          <td>
            <span className="conf-bar">
              <span
                className={`conf-fill ${confCls}`}
                style={{ width: `${confPct}%` }}
              ></span>
            </span>
            <span className="conf-val">{confPct}%</span>
          </td>
          <td>
            {row.flagged ? (
              <span className="flag-icon">● Gap</span>
            ) : (
              <span className="conf-val" style={{ color: "var(--ok)" }}>
                ● OK
              </span>
            )}
          </td>
        </tr>
      );
    });
  }, [rows]);

  return (
    <Layout activeTab="emissions-ledger">
      <main className="main">
        <div className="page-head">
          <div>
            <div className="eyebrow">Emissions Ledger · CSRD · ESRS E1 · FY2025 Disclosure</div>
            <h1 className="page-title">
              Your <em>expertly-crafted</em> <br />
              Emissions Ledger,
            </h1>
            <p className="page-desc">
              Grevia orchestrates a three-agent pipeline that ingests operational data, classifies it against recognised frameworks, and produces an auditor-ready report. You stay in control of every line.
            </p>
          </div>
          <div className="head-meta">
            <strong>Last sync · 19 Apr 2026, 09:14 UTC</strong>
            87 data sources · 14,302 records · reviewer: L. Reyes
          </div>
        </div>

        {/* Workflow  */}
        <section className="workflow">
          <div className="workflow-head">
            <div className="workflow-title">Reporting workflow</div>
            <div className="workflow-status">
              Step 3 of 5 · Framework mapping in progress
            </div>
          </div>
          <div className="steps">
            <div
              className="step-line"
              style={{ gridColumn: "1 / -1", left: "10%", right: "10%" }}
            ></div>
            <div
              className="step-line done"
              style={{ gridColumn: "1 / -1", left: "10%", right: "10%" }}
            ></div>
            <div className="step done">
              <div className="step-node">✓</div>
              <div className="step-label">Data ingestion</div>
              <div className="step-sub">87 sources</div>
            </div>
            <div className="step done">
              <div className="step-node">✓</div>
              <div className="step-label">Audit &amp; classify</div>
              <div className="step-sub">14,302 records</div>
            </div>
            <div className="step active current">
              <div className="step-node">3</div>
              <div className="step-label">Framework map</div>
              <div className="step-sub">7 frameworks</div>
            </div>
            <div className="step">
              <div className="step-node">4</div>
              <div className="step-label">Report draft</div>
              <div className="step-sub">Queued</div>
            </div>
            <div className="step">
              <div className="step-node">5</div>
              <div className="step-label">Export</div>
              <div className="step-sub">PDF · CSV · XBRL</div>
            </div>
          </div>
        </section>

        <div className="sec-head">
          <div className="sec-title">
            <span className="num">01</span>Active agents
          </div>
          <div className="sec-actions">
            <span className="chip">Orchestration log</span>
          </div>
        </div>

        <div className="agents">
          <div className="agent-card">
            <div className="agent-top">
              <div className="agent-avatar">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 11l3 3 8-8" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <span className="agent-status status-done">Complete</span>
            </div>
            <div className="agent-name">Data Auditor</div>
            <div className="agent-role">
              Validates completeness &amp; outliers across ingested records
            </div>
            <div className="agent-meta">
              <span>
                Runtime <strong>2m 18s</strong>
              </span>
              <span>
                Findings <strong>23</strong>
              </span>
            </div>
          </div>

          <div className="agent-card running is-selected">
            <div className="agent-top">
              <div className="agent-avatar sand">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                </svg>
              </div>
              <span className="agent-status status-running">
                <span className="dot-run"></span>Running
              </span>
            </div>
            <div className="agent-name">Framework Expert</div>
            <div className="agent-role">
              Maps emissions to ESRS E1, GRI 305, TCFD &amp; ISSB
            </div>
            <div className="agent-meta">
              <span>
                Progress <strong>64%</strong>
              </span>
              <span>
                Mapped <strong>214 / 336</strong>
              </span>
            </div>
          </div>

          <div className="agent-card">
            <div className="agent-top">
              <div className="agent-avatar ink">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                  <circle cx="11" cy="11" r="2" />
                </svg>
              </div>
              <span className="agent-status status-idle">Idle · queued</span>
            </div>
            <div className="agent-name">Report Writer</div>
            <div className="agent-role">
              Drafts narrative disclosures &amp; management commentary
            </div>
            <div className="agent-meta">
              <span>
                ETA <strong>~4 min</strong>
              </span>
              <span>
                Templates <strong>CSRD · SEC</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="sec-head">
          <div className="sec-title">
            <span className="num">02</span>Disclosure snapshot
          </div>
        </div>

        <div className="metrics">
          <div className="metric">
            <div className="metric-label">
              <span>Total CO₂e</span>
              <span className="mono">Scope 1+2+3</span>
            </div>
            <div className="metric-value">
              184,207<span className="metric-unit">tCO₂e</span>
            </div>
            <div className="metric-delta">
              <strong>↓ 6.4%</strong> vs FY2024 baseline (196,838)
            </div>
            <svg
              className="metric-spark"
              viewBox="0 0 200 28"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke="#0F6E56"
                strokeWidth="1.5"
                points="0,18 20,16 40,19 60,14 80,15 100,12 120,14 140,10 160,11 180,8 200,9"
              />
            </svg>
          </div>
          <div className="metric">
            <div className="metric-label">
              <span>Data coverage</span>
              <span className="mono">auto+reviewed</span>
            </div>
            <div className="metric-value">
              92.4<span className="metric-unit">%</span>
            </div>
            <div className="metric-delta">
              <strong>↑ 11 pts</strong> from FY2024 · 7.6% est.
            </div>
            <svg
              className="metric-spark"
              viewBox="0 0 200 28"
              preserveAspectRatio="none"
            >
              <rect x="0" y="4" width="200" height="20" fill="#EFEDE6" />
              <rect x="0" y="4" width="184.8" height="20" fill="#0F6E56" />
            </svg>
          </div>
          <div className="metric flag">
            <div className="metric-label">
              <span>Gaps flagged</span>
              <span className="mono">by Data Auditor</span>
            </div>
            <div className="metric-value">
              23<span className="metric-unit">open</span>
            </div>
            <div className="metric-delta warn">
              <strong>14 Scope 3</strong> · 6 Scope 2 · 3 Scope 1
            </div>
            <svg
              className="metric-spark"
              viewBox="0 0 200 28"
              preserveAspectRatio="none"
            >
              <g fill="#E5A24A">
                <rect x="0" y="10" width="6" height="14" />
                <rect x="10" y="6" width="6" height="18" />
                <rect x="20" y="12" width="6" height="12" />
                <rect x="30" y="4" width="6" height="20" />
                <rect x="40" y="8" width="6" height="16" />
                <rect x="50" y="14" width="6" height="10" />
                <rect x="60" y="10" width="6" height="14" />
                <rect x="70" y="2" width="6" height="22" />
                <rect x="80" y="6" width="6" height="18" />
                <rect x="90" y="11" width="6" height="13" />
                <rect x="100" y="15" width="6" height="9" />
                <rect x="110" y="9" width="6" height="15" />
                <rect x="120" y="13" width="6" height="11" />
                <rect x="130" y="7" width="6" height="17" />
              </g>
            </svg>
          </div>
        </div>

        <div className="sec-head">
          <div className="sec-title">
            <span className="num">03</span>Emissions ledger
          </div>
          <div className="sec-actions table-filters">
            <span className="chip is-active">All · {rows.length}</span>
            <span className="chip">
              Scope 1 · {rows.filter((row) => row.scope === 1).length}
            </span>
            <span className="chip">
              Scope 2 · {rows.filter((row) => row.scope === 2).length}
            </span>
            <span className="chip">
              Scope 3 · {rows.filter((row) => row.scope === 3).length}
            </span>
            <span className="chip">
              Flagged · {rows.filter((row) => row.flagged).length}
            </span>
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-head">
            <div>
              <span className="t-title">Category-level emissions</span>
              <span className="t-sub">
                Click a row to highlight · AI chat will reference it
              </span>
            </div>
            <div
              className="mono"
              style={{ fontSize: "11px", color: "var(--ink-3)" }}
            >
              EXPORT · 12 ROWS · FY2025
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "150px" }}>Scope</th>
                <th>Category</th>
                <th className="num">tCO₂e</th>
                <th className="num">% total</th>
                <th style={{ width: "180px" }}>Confidence</th>
                <th style={{ width: "50px" }}>Status</th>
              </tr>
            </thead>
            <tbody>{table}</tbody>
          </table>
        </div>
      </main>
    </Layout>
  );
}

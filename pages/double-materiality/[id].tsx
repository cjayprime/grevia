import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import type {
  MaterialityAssessment,
  MaterialityBreakdown,
  VizTab,
} from "../../types";
import {
  Layout,
  QuadrantScatter,
  MatrixChart,
  BreakdownTable,
} from "../../components";
import { API, authFetch, notifyError } from "../../helpers";

const PAGE_SIZE = 10;

export default function MaterialityDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [assessment, setAssessment] = useState<MaterialityAssessment | null>(
    null,
  );
  const [allBreakdowns, setAllBreakdowns] = useState<MaterialityBreakdown[]>(
    [],
  );
  const [tableBreakdowns, setTableBreakdowns] = useState<
    MaterialityBreakdown[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [vizTab, setVizTab] = useState<VizTab>("quadrant");
  const [activeSubTopic, setActiveSubTopic] = useState<string | null>(null);
  const [bdPage, setBdPage] = useState(1);
  const [bdTotal, setBdTotal] = useState(0);
  const [bdLoading, setBdLoading] = useState(false);

  const fetchPage = useCallback(
    async (page: number, topic?: string | null) => {
      if (!id) return;
      setBdLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (topic && topic !== "all") params.set("topic", topic);
        const res = await authFetch(
          `${API}/api/v1/materiality/${id}?${params}`,
        );
        if (res.ok) {
          const data = await res.json();
          setTableBreakdowns(data.breakdowns || []);
          setBdTotal(data.bd_total ?? 0);
          setBdPage(data.bd_page ?? page);
          if (data.all_breakdowns?.length)
            setAllBreakdowns(data.all_breakdowns);
        }
      } catch {
        /* silent */
      }
      setBdLoading(false);
    },
    [id],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(
          `${API}/api/v1/materiality/${id}?page=1&limit=${PAGE_SIZE}`,
        );
        if (!res.ok) {
          notifyError("Assessment not found");
          router.replace("/double-materiality");
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setAssessment(data);
          setAllBreakdowns(data.all_breakdowns || data.breakdowns || []);
          setTableBreakdowns(data.breakdowns || []);
          setBdTotal(data.bd_total ?? 0);
          setBdPage(data.bd_page ?? 1);
        }
      } catch {
        notifyError("Could not load assessment");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const handlePageChange = useCallback(
    (page: number) => {
      fetchPage(page, activeSubTopic);
    },
    [fetchPage, activeSubTopic],
  );

  const handleTopicFilter = useCallback(
    (topic: string) => {
      fetchPage(1, topic === "all" ? null : topic);
    },
    [fetchPage],
  );

  const handleSubTopicClick = useCallback(
    (topic: string) => {
      setActiveSubTopic((prev) => {
        const next = prev === topic ? null : topic;
        fetchPage(1, next);
        return next;
      });
    },
    [fetchPage],
  );

  if (loading) {
    return (
      <Layout activeTab="double-materiality">
        <main className="main">
          <div className="dm-loading-wrap">
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
            <h2>Loading assessment…</h2>
          </div>
        </main>
      </Layout>
    );
  }

  if (!assessment) return null;

  return (
    <Layout activeTab="double-materiality">
      <main className="main">
        <div className="page-head">
          <div>
            <div className="eyebrow dm-breadcrumb">
              <button
                className="dm-back-btn"
                onClick={() => router.push("/double-materiality")}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 12L6 8l4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                BACK
              </button>
              <span className="eyebrow-sep">/</span>
              <span>Assessment #{assessment.materiality_assessment_id}</span>
            </div>
            <h1 className="page-title">
              {assessment.standard} Materiality <br />
              <em>Assessment</em>
            </h1>
            <p className="page-desc">
              {assessment.industry && `${assessment.industry} · `}
              {assessment.region && `${assessment.region} · `}
              {bdTotal || allBreakdowns.length} disclosure requirements ·{" "}
              {new Date(assessment.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="head-meta">
            <strong>
              {bdTotal || allBreakdowns.length} disclosure requirements
            </strong>
            {assessment.standard} · {assessment.industry} · {assessment.region}
          </div>
        </div>

        <div className="hs-topbar">
          <div className="hs-tabs">
            <div className="dm-pill-tabs">
              {(["quadrant", "matrix"] as VizTab[]).map((t) => (
                <button
                  key={t}
                  className={`chip ${vizTab === t ? "is-active" : ""}`}
                  onClick={() => setVizTab(t)}
                >
                  {t === "quadrant" ? "4-Quadrant Plot" : "Radar Chart"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="dm-viz-wrap">
          {vizTab === "quadrant" && (
            <QuadrantScatter
              breakdowns={allBreakdowns}
              onTopicClick={handleSubTopicClick}
            />
          )}

          {vizTab === "matrix" && (
            <MatrixChart
              breakdowns={allBreakdowns}
              onTopicClick={handleSubTopicClick}
            />
          )}
        </div>

        <BreakdownTable
          breakdowns={tableBreakdowns}
          highlight={activeSubTopic}
          page={bdPage}
          totalItems={bdTotal}
          pageSize={PAGE_SIZE}
          loading={bdLoading}
          onPageChange={handlePageChange}
          onTopicFilter={handleTopicFilter}
        />
      </main>
    </Layout>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  Layout,
  Upload,
  HotReport,
  Preview,
  Empty,
} from "../components";
import {
  API,
  authFetch,
  formatBytes,
  formatDate,
  CATEGORIES,
  FILE_TYPES,
  FILE_ICONS,
  extractError,
  notifyError,
} from "../helpers";
import type { ListResponse, Doc, Category } from "../types";

export default function HotStorePage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refetchKey, setRefetchKey] = useState(0);

  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState<"all" | "hot">("all");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [hotReportOpen, setHotReportOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);

  const docCount = loading ? "…" : total;

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  // Fetch documents when filters or refetchKey change
  const fetchDocs = useCallback(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "24");
    params.set("refetchKey", String(refetchKey));
    if (activeCategory !== "all")
      params.set("category", activeCategory as Category);
    if (activeTypes.size) params.set("file_type", [...activeTypes].join(","));
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (tab === "hot") params.set("is_hot_report", "true");

    authFetch(`${API}/api/v1/hot-store/documents?${params}`)
      .then(async (res) => {
        if (!res.ok) { notifyError(await extractError(res)); if (!cancelled) setLoading(false); return; }
        return res.json();
      })
      .then((data: ListResponse | undefined) => {
        if (!cancelled && data) {
          setDocs(data.documents);
          setTotal(data.total);
          setTotalPages(data.total_pages);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { notifyError("Could not load documents"); setLoading(false); }
      });

    return () => {
      cancelled = true;
    };
  }, [page, activeCategory, activeTypes, dateFrom, dateTo, tab, refetchKey]);

  // Toggle file type filter
  const toggleType = useCallback((t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
    setPage(1);
  }, []);

  // Soft delete
  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("Remove this document?")) return;
      try {
        const res = await authFetch(`${API}/api/v1/hot-store/documents/${id}`, { method: "DELETE" });
        if (!res.ok) { notifyError(await extractError(res)); return; }
        refetch();
      } catch {
        notifyError("Failed to delete document");
      }
    },
    [refetch],
  );

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  return (
    <Layout activeTab="hot-store">
      <main className="main">
        {/* Page head */}
        <div className="page-head">
          <div>
            <div className="eyebrow">Document Infrastructure</div>
            <h1 className="page-title">
              Your <em>Centralized</em> <br />
              Hot Store,
            </h1>
            <p className="page-desc">
              Upload, organize, and generate AI-powered ESG reports from your
              company documents. All files are securely stored and indexed for
              instant retrieval.
            </p>
          </div>
          <div className="head-meta">
            <strong>{docCount} documents</strong>
            Hot Reports · Policies · Legal · Financial
          </div>
        </div>

        {/* Top bar */}
        <div className="hs-topbar">
          <div className="hs-tabs">
            <button
              className={`chip ${tab === "all" ? "is-active" : ""}`}
              onClick={() => {
                setTab("all");
                setPage(1);
              }}
            >
              All Documents
            </button>
            <button
              className={`chip ${tab === "hot" ? "is-active" : ""}`}
              onClick={() => {
                setTab("hot");
                setPage(1);
              }}
            >
              Hot Reports
            </button>
          </div>

          <div className="hs-actions">
            <button
              className="hs-btn primary"
              onClick={() => setUploadOpen(true)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Upload Documents
            </button>

            <button
              className="hs-btn amber"
              onClick={() => setHotReportOpen(true)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Hot Report
            </button>
          </div>
        </div>

        {/* Body: sidebar + grid */}
        <div className="hs-body">
          {/* Filter sidebar */}
          <aside className="hs-sidebar">
            <div className="hs-filter-section">
              <div className="hs-filter-label">Category</div>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`hs-filter-item ${activeCategory === c ? "active" : ""}`}
                  onClick={() => {
                    setActiveCategory(c);
                    setPage(1);
                  }}
                >
                  {c.substring(0, 1).toUpperCase() + c.substring(1)}
                  {activeCategory === c && <span className="hs-filter-dot" />}
                </button>
              ))}
            </div>

            <div className="hs-filter-section">
              <div className="hs-filter-label">File Type</div>
              <div className="hs-type-chips">
                {FILE_TYPES.map((t) => (
                  <button
                    key={t}
                    className={`chip ${activeTypes.has(t) ? "is-active" : ""}`}
                    onClick={() => toggleType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="hs-filter-section">
              <div className="hs-filter-label">Date Range</div>
              <input
                type="date"
                className="hs-date-input"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
              <input
                type="date"
                className="hs-date-input"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </aside>

          {/* Document grid */}
          <section className="hs-grid-area">
            {loading && <div className="hs-loading">Loading…</div>}

            {!loading && docs?.length === 0 && (
              <Empty
                icon={
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="8" y="6" width="32" height="36" rx="4" stroke="var(--forest)" strokeWidth="2" />
                    <path d="M16 18h16M16 24h10M16 30h14" stroke="var(--forest)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                    <circle cx="36" cy="36" r="10" fill="var(--forest-soft)" stroke="var(--forest)" strokeWidth="2" />
                    <path d="M33 36h6M36 33v6" stroke="var(--forest)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                }
                title="No documents yet"
                description="Upload your first file to get started. Documents stored here can be used across all ESG features — materiality assessments, emissions analysis, and policy extraction."
              />
            )}

            <div className="hs-grid">
              {docs.map((doc) => {
                const info = FILE_ICONS[doc.file_type] || FILE_ICONS.OTHER;
                return (
                  <div
                    key={doc.hot_store_id}
                    className={`hs-card ${doc.is_hot_report ? "hot-report" : ""}`}
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <div className="hs-card-top">
                      <span
                        className="hs-card-icon"
                        style={{
                          background: info.color + "18",
                          color: info.color,
                        }}
                      >
                        {info.icon}
                      </span>
                      <button
                        className="hs-card-delete"
                        title="Remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.hot_store_id);
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M8 6V4h8v2M10 11v6M14 11v6M5 6l1 14h12l1-14" />
                        </svg>
                      </button>
                    </div>
                    <div className="hs-card-name" title={doc.original_filename}>
                      {doc.original_filename}
                    </div>
                    <div className="hs-card-meta">
                      <span
                        className={`hs-badge cat-${doc.category.toLowerCase()}`}
                      >
                        {doc.category}
                      </span>
                      <span>{formatBytes(doc.file_size)}</span>
                    </div>
                    <div className="hs-card-date">{formatDate(doc.date)}</div>
                    {doc.is_hot_report && (
                      <span className="hs-hot-badge">Hot Report</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="hs-pagination">
                <button
                  className="chip"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Prev
                </button>
                <span className="hs-page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="chip"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Modals */}
        {uploadOpen && (
          <Upload
            onClose={() => setUploadOpen(false)}
            onDone={() => {
              setUploadOpen(false);
              fetchDocs();
            }}
          />
        )}

        {hotReportOpen && (
          <HotReport
            onClose={() => setHotReportOpen(false)}
            onDone={() => {
              setHotReportOpen(false);
              fetchDocs();
            }}
          />
        )}

        {previewDoc && (
          <Preview doc={previewDoc} onClose={() => setPreviewDoc(null)} />
        )}
      </main>
    </Layout>
  );
}

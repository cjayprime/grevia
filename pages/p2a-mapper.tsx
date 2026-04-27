import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Layout, DocumentSelector, Upload, PolicyDetail } from "../components";
import { KanbanCol, OnboardingBanner } from "../components/kanban";
import { getPillar } from "../components/kanban/utils";
import { API, authFetch, extractError, notifyError, notifySuccess } from "../helpers";
import { useCompany } from "../context/CompanyContext";
import type {
  PolicyItem,
  PolicyBoard,
  KanbanColumn,
  PolicyPriority,
  MdrType,
  Doc,
} from "../types";
import { COLUMN_LABELS } from "../types";

type PillarFilter = "all" | "E" | "S" | "G";
type PriorityFilter = "all" | PolicyPriority;
type MdrFilter = "all" | MdrType;

// ── Constants ───────────────────────────────────────────────
const EMPTY_BOARD: PolicyBoard = {
  policy_defined: [],
  action_planned: [],
  action_implemented: [],
  action_progress: [],
  action_blocked: [],
  outcome_verified: [],
};

const COLUMNS: KanbanColumn[] = [
  "policy_defined",
  "action_planned",
  "action_progress",
  "action_blocked",
  "action_implemented",
  "outcome_verified",
];

const BANNER_DISMISSED_KEY = "pm_banner_dismissed";

// ── Page ────────────────────────────────────────────────────
export default function P2AMapper() {
  const { companyId } = useCompany();
  const [board, setBoard] = useState<PolicyBoard>(EMPTY_BOARD);
  const [loading, setLoading] = useState(true);
  const [hotDocs, setHotDocs] = useState<Doc[]>([]);

  const [pillarFilter, setPillarFilter] = useState<PillarFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [mdrFilter, setMdrFilter] = useState<MdrFilter>("all");

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const [activeCard, setActiveCard] = useState<PolicyItem | null>(null);
  const [detailItem, setDetailItem] = useState<PolicyItem | null>(null);
  const [addingToCol, setAddingToCol] = useState<KanbanColumn | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const bannerDismissed = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem(BANNER_DISMISSED_KEY) === "1",
    () => false,
  );
  const [bannerVisible, setBannerVisible] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const fetchBoard = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await authFetch(`${API}/api/v1/policy?company_id=${companyId}`);
      if (!res.ok) { notifyError(await extractError(res)); return; }
      const data = await res.json();
      if (data && typeof data === "object") {
        setBoard({
          policy_defined: data.policy_defined || [],
          action_planned: data.action_planned || [],
          action_implemented: data.action_implemented || [],
          action_progress: data.action_progress || [],
          action_blocked: data.action_blocked || [],
          outcome_verified: data.outcome_verified || [],
        });
      }
    } catch {
      notifyError("Could not load policy board — check your connection");
    }
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchBoard();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchBoard]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`${API}/api/v1/hot-store/documents?limit=100`);
        if (!res.ok) { notifyError(await extractError(res)); return; }
        const data = await res.json();
        if (!cancelled) setHotDocs(data.documents || []);
      } catch {
        notifyError("Could not load documents");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(BANNER_DISMISSED_KEY, "1");
    setBannerVisible(false);
  }, []);

  const allItems = useMemo(
    () => COLUMNS.flatMap((col) => board[col]),
    [board],
  );

  const filteredBoard = useMemo<PolicyBoard>(() => {
    const filter = (items: PolicyItem[]) =>
      items.filter((item) => {
        if (pillarFilter !== "all") {
          const p = getPillar(item.esrs_reference);
          if (p !== pillarFilter) return false;
        }
        if (priorityFilter !== "all" && item.priority !== priorityFilter)
          return false;
        if (mdrFilter !== "all" && item.mdr_type !== mdrFilter) return false;
        return true;
      });
    return {
      policy_defined: filter(board.policy_defined),
      action_planned: filter(board.action_planned),
      action_implemented: filter(board.action_implemented),
      action_progress: filter(board.action_progress),
      action_blocked: filter(board.action_blocked),
      outcome_verified: filter(board.outcome_verified),
    };
  }, [board, pillarFilter, priorityFilter, mdrFilter]);

  const progress = useMemo(() => {
    const total = allItems.length;
    if (!total) return 0;
    return Math.round((board.outcome_verified.length / total) * 100);
  }, [allItems.length, board.outcome_verified.length]);

  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      const id = e.active.id as number;
      const found = allItems.find((item) => item.policy_item_id === id);
      setActiveCard(found || null);
    },
    [allItems],
  );

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      setActiveCard(null);
      const { active, over } = e;
      if (!over) return;

      const itemId = active.id as number;
      const targetCol = over.id as KanbanColumn;

      const sourceCol = COLUMNS.find((col) =>
        board[col].some((i) => i.policy_item_id === itemId),
      );
      if (!sourceCol || sourceCol === targetCol) return;

      setBoard((prev) => {
        const item = prev[sourceCol].find((i) => i.policy_item_id === itemId)!;
        return {
          ...prev,
          [sourceCol]: prev[sourceCol].filter((i) => i.policy_item_id !== itemId),
          [targetCol]: [...prev[targetCol], { ...item, kanban_column: targetCol }],
        };
      });

      try {
        const res = await authFetch(`${API}/api/v1/policy/${itemId}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ column: targetCol }),
        });
        if (!res.ok) { notifyError(await extractError(res)); await fetchBoard(); }
      } catch {
        notifyError("Failed to move card — reverting");
        await fetchBoard();
      }
    },
    [board, fetchBoard],
  );

  const handleExtract = useCallback(
    async (docIds: number[]) => {
      if (!companyId) return;
      setExtracting(true);
      try {
        const res = await authFetch(`${API}/api/v1/policy/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: companyId, hot_store_ids: docIds }),
        });
        if (res.ok) {
          await fetchBoard();
          notifySuccess("Extraction complete — board updated");
          dismissBanner();
        } else {
          notifyError(await extractError(res));
        }
      } catch {
        notifyError("Extraction failed — check your connection");
      }
      setExtracting(false);
      setSelectorOpen(false);
    },
    [companyId, fetchBoard, dismissBanner],
  );

  const handleUpdate = useCallback((updated: PolicyItem) => {
    setBoard((prev) => {
      const newBoard = { ...prev };
      // Remove from all columns first
      for (const col of COLUMNS) {
        newBoard[col] = prev[col].filter(
          (item) => item.policy_item_id !== updated.policy_item_id,
        );
      }
      // Place in correct column
      newBoard[updated.kanban_column] = [
        ...newBoard[updated.kanban_column],
        updated,
      ];
      return newBoard;
    });
    setDetailItem(updated);
  }, []);

  const handleDelete = useCallback((id: number) => {
    setBoard((prev) => {
      const newBoard = { ...prev };
      for (const col of COLUMNS) {
        newBoard[col] = prev[col].filter((i) => i.policy_item_id !== id);
      }
      return newBoard;
    });
    setDetailItem(null);
  }, []);

  const handleAddCard = useCallback(
    async (col: KanbanColumn) => {
      if (!companyId || !newCardTitle.trim()) return;
      try {
        const res = await authFetch(`${API}/api/v1/policy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: companyId,
            title: newCardTitle,
            kanban_column: col,
          }),
        });
        if (!res.ok) { notifyError(await extractError(res)); return; }
        const data = await res.json();
        setBoard((prev) => ({
          ...prev,
          [col]: [...prev[col], data],
        }));
        setNewCardTitle("");
        setAddingToCol(null);
      } catch {
        notifyError("Failed to create card");
      }
    },
    [companyId, newCardTitle],
  );

  const refreshDocs = useCallback(async () => {
    setUploadOpen(false);
    try {
      const res = await authFetch(`${API}/api/v1/hot-store/documents?limit=100`);
      if (!res.ok) { notifyError(await extractError(res)); return; }
      const data = await res.json();
      setHotDocs(data.documents || []);
    } catch {
      notifyError("Could not refresh documents");
    }
  }, []);

  const showBanner = bannerVisible && !bannerDismissed && allItems.length === 0;

  return (
    <Layout activeTab="p2a-mapper">
      <main className="main pm-kanban-main">
        <div className="page-head">
            <div>
              <div className="eyebrow">Strategy &amp; Governance · CSRD · MDR-P / MDR-A</div>
              <h1 className="page-title">
                Policy to Action <br /><em>Mapper</em>
              </h1>
              <p className="page-desc">
                Extract MDR-P policies and MDR-A actions from your documents,
                track their implementation across ESRS disclosures, and verify
                outcomes for CSRD compliance.
              </p>
            </div>
            {allItems.length > 0 && (
              <div className="head-meta">
                <strong>{allItems.length} items</strong> ·{" "}
                {board.outcome_verified.length} verified · {progress}%
              </div>
            )}
          </div>

          <div className="hs-topbar">
            <div className="hs-tabs">
              <div className="dm-pill-tabs">
                {(["all", "E", "S", "G"] as PillarFilter[]).map((p) => (
                  <button
                    key={p}
                    className={`chip ${pillarFilter === p ? "is-active" : ""}`}
                    onClick={() => setPillarFilter(p)}
                  >
                    {p === "all" ? "All pillars" : `ESRS ${p}`}
                  </button>
                ))}
                <span style={{ margin: "0 4px", color: "var(--rule)" }}>|</span>
                {(["all", "MDR-P", "MDR-A"] as MdrFilter[]).map((m) => (
                  <button
                    key={m}
                    className={`chip ${mdrFilter === m ? "is-active" : ""}`}
                    onClick={() => setMdrFilter(m as MdrFilter)}
                  >
                    {m === "all" ? "All types" : m}
                  </button>
                ))}
                <span style={{ margin: "0 4px", color: "var(--rule)" }}>|</span>
                {(["all", "critical", "high", "medium", "low"] as PriorityFilter[]).map((p) => (
                  <button
                    key={p}
                    className={`chip ${priorityFilter === p ? "is-active" : ""}`}
                    onClick={() => setPriorityFilter(p)}
                  >
                    {p === "all" ? "All priority" : p}
                  </button>
                ))}
              </div>
            </div>
            <div className="hs-actions">
              <button className="hs-btn" onClick={() => setUploadOpen(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Upload Documents
              </button>
              <button
                className="hs-btn primary"
                onClick={() => setSelectorOpen(true)}
                disabled={extracting}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {extracting ? "Extracting…" : "Extract from Documents"}
              </button>
            </div>
          </div>

        {/* Dismissable banner (only when board is empty) */}
        {showBanner && <OnboardingBanner onDismiss={dismissBanner} />}

        {/* Kanban board — fills remaining height */}
        <div className="pm-board-wrap">
          {loading ? (
            <div className="pm-board-loading">Loading board…</div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="pm-board">
                {COLUMNS.map((col) => (
                  <KanbanCol
                    key={col}
                    colId={col}
                    items={filteredBoard[col]}
                    onCardClick={(item) => setDetailItem(item)}
                    onAddCard={(c) => setAddingToCol(c)}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeCard && (
                  <div className="pm-card pm-card-overlay">
                    <div className="pm-card-title">{activeCard.title}</div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Add card modal */}
        {addingToCol && (
          <div className="modal-overlay" onClick={() => setAddingToCol(null)}>
            <div
              className="modal"
              style={{ maxWidth: 400 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-head">
                <h2>Add card to {COLUMN_LABELS[addingToCol]}</h2>
                <button className="modal-close" onClick={() => setAddingToCol(null)}>✕</button>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <input
                  className="pm-input"
                  placeholder="Policy or action title"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCard(addingToCol)}
                  autoFocus
                />
              </div>
              <div style={{ display: "flex", gap: 8, padding: "0 20px 16px", justifyContent: "flex-end" }}>
                <button className="hs-btn" onClick={() => setAddingToCol(null)}>Cancel</button>
                <button
                  className="hs-btn primary"
                  disabled={!newCardTitle.trim()}
                  onClick={() => handleAddCard(addingToCol)}
                >
                  Add Card
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail drawer */}
        {detailItem && (
          <PolicyDetail
            item={detailItem}
            onClose={() => setDetailItem(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}

        {/* Document selector */}
        {selectorOpen && (
          <DocumentSelector
            docs={hotDocs}
            onClose={() => setSelectorOpen(false)}
            onConfirm={handleExtract}
            loading={extracting}
          />
        )}

        {/* Upload modal */}
        {uploadOpen && (
          <Upload onClose={() => setUploadOpen(false)} onDone={refreshDocs} />
        )}
      </main>
    </Layout>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Message from "./Message";
import { API, authFetch, extractError, notifyError } from "../helpers";
import { useCompany } from "../context/CompanyContext";
import type { ChatMessage, Doc } from "../types";

interface AssistantProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

type Framework =
  | "CSRD"
  | "ESRS E1"
  | "GRI 305"
  | "TCFD"
  | "ISSB S2"
  | "CDP"
  | "UN SDG 13";

const ALL_FRAMEWORKS: Framework[] = [
  "CSRD",
  "ESRS E1",
  "GRI 305",
  "TCFD",
  "ISSB S2",
  "CDP",
  "UN SDG 13",
];
const ACTIVE_FRAMEWORKS: Set<Framework> = new Set(["CSRD", "ESRS E1"]);
const DEFAULT_ON: Set<Framework> = new Set(["CSRD", "ESRS E1"]);

let _msgId = 0;
function nextId() {
  return String(++_msgId);
}

export default function Assistant({
  isCollapsed,
  setIsCollapsed,
}: AssistantProps) {
  const { companyId, workspaces, workspacesLoading } = useCompany();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeFrameworks, setActiveFrameworks] =
    useState<Set<Framework>>(DEFAULT_ON);
  const chatRef = useRef<HTMLDivElement>(null);

  // Gate state
  const workspace = useMemo(() => workspaces[0] ?? null, [workspaces]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const gateLoading = workspacesLoading || docsLoading;

  // File picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--assistant-width",
      isCollapsed ? "64px" : "420px",
    );
  }, [isCollapsed]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(
          `${API}/api/v1/hot-store/documents?limit=100`,
        );
        if (!cancelled && res.ok) {
          const data = await res.json();
          setDocs(data.documents || []);
        }
      } catch {
        /* offline */
      }
      if (!cancelled) setDocsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const isBlocked = useMemo(
    () => !gateLoading && (!workspace || docs.length === 0),
    [gateLoading, workspace, docs.length],
  );

  const blockReason = useMemo(() => {
    if (!workspace && docs.length === 0)
      return "Set up a workspace and upload at least one document to use the assistant.";
    if (!workspace) return "Set up a workspace before using the assistant.";
    if (docs.length === 0)
      return "Upload at least one document to the Hot Store before using the assistant.";
    return "";
  }, [workspace, docs.length]);

  const toggleDoc = useCallback((id: number) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleFramework = useCallback((fw: Framework) => {
    setActiveFrameworks((prev) => {
      const next = new Set(prev);
      if (next.has(fw)) {
        next.delete(fw);
      } else {
        next.add(fw);
      }
      return next;
    });
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || isBlocked) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: nextId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await authFetch(`${API}/api/v1/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          company_id: companyId,
          history,
          frameworks: [...activeFrameworks],
          rag_mode: "balanced",
          hot_store_ids: [...selectedDocIds],
        }),
      });
      if (!res.ok) {
        notifyError(await extractError(res));
      } else {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: data.answer ?? "Sorry, I couldn't generate a response.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      notifyError(
        "Could not reach the assistant — check that the backend is running",
      );
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    isBlocked,
    messages,
    companyId,
    activeFrameworks,
    selectedDocIds,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const clearThread = useCallback(() => setMessages([]), []);

  if (isCollapsed) {
    return (
      <aside className="assistant collapsed">
        <div className="assistant-container">
          <div className="assistant-collapsed-content">
            <button
              className="assistant-collapsed-icon"
              onClick={() => setIsCollapsed(false)}
              title="Expand Assistant"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M21.25 6.72v10.56a2.97 2.97 0 0 1-2.97 2.97H5.72a2.97 2.97 0 0 1-2.97-2.97V6.72a2.97 2.97 0 0 1 2.97-2.97h12.56a2.97 2.97 0 0 1 2.97 2.97" />
                <path
                  d="M6.25 7.25v9.5"
                  className="transition-transform duration-250 translate-x-[10.5px]"
                />
              </svg>
            </button>
            <div className="assistant-label-vertical">Assistant</div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="assistant">
      <div className="assistant-container">
        <div className="assistant-head">
          <button
            className="nav-collapse-btn"
            onClick={() => setIsCollapsed(true)}
            title="Collapse Assistant"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M21.25 6.72v10.56a2.97 2.97 0 0 1-2.97 2.97H5.72a2.97 2.97 0 0 1-2.97-2.97V6.72a2.97 2.97 0 0 1 2.97-2.97h12.56a2.97 2.97 0 0 1 2.97 2.97" />
              <path
                d="M6.25 7.25v9.5"
                className="transition-transform duration-250 translate-x-px"
              />
            </svg>
          </button>
          <div className="assistant-title">
            Assistant <span className="tag">RAG · Context-aware</span>
          </div>
          <button className="icon-btn" title="New thread" onClick={clearThread}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div className="frameworks">
          <div className="frameworks-label">
            Applied frameworks · click to toggle
          </div>
          <div className="fw-tags">
            {ALL_FRAMEWORKS.map((fw) => {
              const enabled = ACTIVE_FRAMEWORKS.has(fw);
              return (
                <span
                  key={fw}
                  className={`fw-tag ${activeFrameworks.has(fw) ? "on" : ""} ${!enabled ? "fw-tag-soon" : ""}`}
                  onClick={() => enabled && toggleFramework(fw)}
                  style={{ cursor: enabled ? "pointer" : "default" }}
                >
                  {fw}
                  {!enabled && <span className="fw-soon-badge">Soon</span>}
                </span>
              );
            })}
          </div>
        </div>

        <div ref={chatRef} style={{ flex: 1, overflowY: "auto" }}>
          {isBlocked ? (
            <div className="chat-gate">
              <div className="chat-gate-icon">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
              </div>
              <p className="chat-gate-msg">{blockReason}</p>
            </div>
          ) : messages.length === 0 && !loading ? (
            <div className="chat" style={{ padding: "20px 16px" }}>
              <div
                style={{
                  color: "var(--ink-3)",
                  fontSize: 13,
                  textAlign: "center",
                  paddingTop: 24,
                }}
              >
                Ask anything about your ESG data — emissions, policies,
                materiality, or compliance gaps.
              </div>
            </div>
          ) : (
            <Message messages={messages} loading={loading} />
          )}
        </div>

        <div className="chat-ctx">
          <span className="ctx-pill">
            <strong>RAG</strong>
            {[...activeFrameworks].length} frameworks
          </span>
          {workspace && (
            <span className="ctx-pill">
              <strong>WS</strong>
              {workspace.industry || `#${workspace.workspace_id}`}
            </span>
          )}
          {selectedDocIds.size > 0 && (
            <span className="ctx-pill ctx-pill-docs">
              <strong>Docs</strong>
              {selectedDocIds.size} pinned
            </span>
          )}
        </div>

        {/* File picker dropdown */}
        {pickerOpen && (
          <div className="chat-file-picker">
            <div className="chat-file-picker-head">
              <span>Pin documents for context</span>
              <button
                className="chat-file-picker-close"
                onClick={() => setPickerOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="chat-file-picker-list">
              {docs.length === 0 ? (
                <div className="chat-file-picker-empty">
                  No documents in Hot Store
                </div>
              ) : (
                docs.map((d) => (
                  <label
                    key={d.hot_store_id}
                    className={`chat-file-picker-row ${selectedDocIds.has(d.hot_store_id) ? "selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.has(d.hot_store_id)}
                      onChange={() => toggleDoc(d.hot_store_id)}
                    />
                    <span
                      className="chat-file-picker-name"
                      title={d.original_filename}
                    >
                      {d.original_filename}
                    </span>
                    <span className="chat-file-picker-type">{d.file_type}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <div className="composer">
          <div
            className={`composer-box ${isBlocked ? "composer-blocked" : ""}`}
          >
            <textarea
              className="composer-input"
              placeholder={
                isBlocked
                  ? blockReason
                  : "Ask about emissions gaps, policy coverage, materiality scores…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || isBlocked}
            />

            <div className="composer-actions">
              <div className="composer-tools">
                <button
                  title="Pin documents for context"
                  onClick={() => setPickerOpen((v) => !v)}
                  className={
                    selectedDocIds.size > 0 ? "composer-tool-active" : ""
                  }
                  disabled={isBlocked}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                  {selectedDocIds.size > 0 && (
                    <span>{selectedDocIds.size}</span>
                  )}
                </button>
                {/* <button title="Model: balanced RAG" style={{ fontSize: 11 }} disabled={isBlocked}>
                  balanced
                </button> */}
              </div>
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={loading || !input.trim() || isBlocked}
              >
                {loading ? "…" : "Send"}
                {!loading && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="export">
          <button className="export-btn" onClick={clearThread}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
            Clear thread
          </button>
          <button className="export-btn primary" data-export="pdf">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export PDF report
          </button>
        </div>
      </div>
    </aside>
  );
}

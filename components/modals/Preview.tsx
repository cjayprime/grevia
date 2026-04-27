import { useCallback, useEffect, useMemo, useState } from "react";
import { API, authFetch, FILE_ICONS } from "../../helpers";
import type { Doc } from "../../types";

interface PreviewData {
  type: string;
  file_type: string;
  url: string;
  data?: string;
  filename: string;
  detailed_description?: string | null;
}

interface PreviewProps {
  doc: Doc;
  onClose: () => void;
}

export default function Preview({ doc, onClose }: PreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(
          `${API}/api/v1/hot-store/documents/${doc.hot_store_id}/preview`,
        );
        setPreview(await res.json());
      } catch {
        /* offline */
      }
      setLoading(false);
    })();
  }, [doc.hot_store_id]);

  const handleDownload = useCallback(() => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = preview.filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }, [preview]);

  const handleOpenExternal = useCallback(() => {
    if (!preview) return;
    window.open(preview.url, "_blank", "noopener,noreferrer");
  }, [preview]);

  const fileIcon = useMemo(() => {
    if (!preview) return null;
    return FILE_ICONS[preview.file_type] || FILE_ICONS.OTHER;
  }, [preview]);

  const canPreview = useMemo(() => {
    if (!preview) return false;
    return ["image", "pdf", "text", "html"].includes(preview.type);
  }, [preview]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal hs-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{doc.original_filename}</h2>

          <div className="modal-head-actions">
            {canPreview && (
              <button className="hs-btn" onClick={handleDownload}>
                Download
              </button>
            )}

            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="hs-preview-body">
          {loading && <div className="hs-loading">Loading preview…</div>}

          {!loading && canPreview && preview?.type === "image" && (
            <img
              src={preview.url}
              alt={preview.filename}
              className="hs-preview-image"
            />
          )}

          {!loading && canPreview && preview?.type === "pdf" && (
            <object
              data={preview.url}
              type="application/pdf"
              className="hs-preview-iframe"
            >
              <p>PDF preview not supported in this browser.</p>
            </object>
          )}

          {!loading && canPreview && preview?.type === "text" && (
            <pre className="hs-preview-text">{preview.data}</pre>
          )}

          {!loading && canPreview && preview?.type === "html" && preview.data && (
            <iframe
              className="hs-preview-iframe"
              srcDoc={preview.data}
              sandbox="allow-scripts"
              title={preview.filename}
            />
          )}

          {!loading && canPreview && preview?.type !== "html" && preview?.detailed_description && (
            <p className="hs-preview-description">{preview.detailed_description}</p>
          )}

          {!loading && !canPreview && preview && (
            <div className="hs-preview-placeholder">
              <span
                className="hs-preview-placeholder-icon"
                style={{
                  background: (fileIcon?.color || "#95a5a6") + "18",
                  color: fileIcon?.color || "#95a5a6",
                }}
              >
                {fileIcon?.icon || "📎"}
              </span>
              <h3>{preview.filename}</h3>
              {preview.detailed_description ? (
                <p className="hs-preview-description">{preview.detailed_description}</p>
              ) : (
                <p>We are unable to display this file. Download it to view.</p>
              )}
              <div className="hs-preview-placeholder-actions">
                <button className="hs-btn primary" onClick={handleDownload}>
                  Download File
                </button>
                <button className="hs-btn" onClick={handleOpenExternal}>
                  Open in New Tab
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

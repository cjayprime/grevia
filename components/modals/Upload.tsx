import { useCallback, useRef, useState } from "react";

import type { Category } from "../../types";
import { API, formatBytes, CATEGORIES } from "../../helpers";
import { useCompany } from "../../context/CompanyContext";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".xlsx", ".csv", ".txt", ".jpg", ".jpeg", ".png",
]);
const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB
const ACCEPT = ".pdf,.docx,.xlsx,.csv,.txt,.jpg,.jpeg,.png";

function getExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function validateFile(f: File): string | null {
  if (!ALLOWED_EXTENSIONS.has(getExtension(f.name))) {
    return `"${f.name}" is not an accepted file type`;
  }
  if (f.size > MAX_FILE_SIZE) {
    return `"${f.name}" exceeds the 250 MB size limit`;
  }
  return null;
}

interface UploadProps {
  onClose: () => void;
  onDone: () => void;
}

export default function Upload({ onClose, onDone }: UploadProps) {
  const { companyId } = useCompany();
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<Category>("other");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    const valid: File[] = [];
    const errs: string[] = [];
    for (const f of incoming) {
      const err = validateFile(f);
      if (err) errs.push(err);
      else valid.push(f);
    }
    if (errs.length) setErrors(errs);
    if (valid.length) setFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  }, [addFiles]);

  const removeFile = useCallback(
    (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx)),
    [],
  );

  const upload = useCallback(async () => {
    if (!companyId) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setProgress((p) => ({ ...p, [f.name]: 0 }));
      const form = new FormData();
      form.append("file", f);
      form.append("category", category);

      try {
        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          // 0–90 % = actual byte transfer to the server
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              setProgress((p) => ({
                ...p,
                [f.name]: Math.min(90, Math.round((ev.loaded / ev.total) * 90)),
              }));
            }
          };
          // upload bytes fully sent — server is now extracting / chunking
          xhr.upload.onload = () => {
            setProgress((p) => ({ ...p, [f.name]: 90 }));
          };
          // server responded → processing done
          xhr.onload = () => {
            setProgress((p) => ({ ...p, [f.name]: 100 }));
            resolve();
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.open("POST", `${API}/api/v1/hot-store/upload`);
          const token = localStorage.getItem("grevia_token");
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(form);
        });
      } catch {
        setProgress((p) => ({ ...p, [f.name]: -1 }));
      }
    }
    setUploading(false);
    onDone();
  }, [files, category, onDone]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal hs-upload-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Upload Documents</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div
          ref={dropRef}
          className="hs-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: "var(--ink-3)" }}
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <p>
            Drag & drop files here or <strong>browse</strong>
          </p>
          <span className="hs-drop-hint">
            PDF, DOCX, XLSX, CSV, TXT, JPG, PNG — max 250 MB each
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={ACCEPT}
            onChange={handleSelect}
          />
        </div>

        {errors.length > 0 && (
          <div className="hs-upload-errors">
            {errors.map((err, i) => (
              <div key={i} className="hs-upload-error">{err}</div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="hs-file-list">
            {files.map((f, i) => (
              <div key={i} className="hs-file-row">
                <span className="hs-file-name">{f.name}</span>
                <span className="hs-file-size">{formatBytes(f.size)}</span>
                {progress[f.name] !== undefined ? (
                  <div className="hs-progress-wrap">
                    <div className="hs-progress">
                      <div
                        className="hs-progress-fill"
                        style={{ width: `${Math.max(0, progress[f.name])}%` }}
                      />
                    </div>
                    <span className="hs-progress-label">
                      {progress[f.name] < 0
                        ? "Failed"
                        : progress[f.name] === 100
                          ? "Done"
                          : progress[f.name] >= 90
                            ? "Processing…"
                            : `${progress[f.name]}%`}
                    </span>
                  </div>
                ) : (
                  <button
                    className="hs-file-remove"
                    onClick={() => removeFile(i)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="hs-upload-footer">
          <label className="hs-select-label">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="hs-select"
            >
              {CATEGORIES.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>
                  {c.substring(0, 1).toUpperCase() + c.substring(1)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="hs-btn primary"
            disabled={!files.length || uploading}
            onClick={upload}
          >
            {uploading
              ? "Uploading…"
              : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

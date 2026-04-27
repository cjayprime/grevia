import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import OrchestrationModal from "./OrchestrationModal";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { company, signout } = useAuth();
  const [orchOpen, setOrchOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      (async () => {
        setDark(true);
      })();
    }
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  const toggleTheme = useCallback(() => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const initials = company
    ? (company.name.charAt(0) + company.name.charAt(company.name.length - 1)).toUpperCase()
    : "??";

  return (
    <>
      <header className="topbar">
        <title>{`${title} | Grevia`}</title>

        <div className="brand">
          <div className="brand-mark"></div>

          <div>
            <div className="brand-name">
              Grevia <em>PRO</em>
            </div>
          </div>

          <div className="brand-sub">Double Materiality Studio · FY2026</div>
        </div>

        <div className="top-actions">
          <button
            className="hs-btn primary orch-run-btn"
            onClick={() => setOrchOpen(true)}
            title="Run full multi-agent ESG analysis"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run ESG Analysis
          </button>

          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>

          <button className="icon-btn">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          <div className="avatar-popover-wrap" ref={popoverRef}>
            <button
              className="avatar"
              onClick={() => setPopoverOpen((p) => !p)}
              title={company?.name || "Account"}
            >
              {initials}
            </button>

            {popoverOpen && (
              <div className="avatar-popover">
                <div className="avatar-popover-header">
                  <div className="avatar avatar-lg">{initials}</div>
                  <div className="avatar-popover-info">
                    <div className="avatar-popover-name">{company?.name}</div>
                    <div className="avatar-popover-email">{company?.email}</div>
                  </div>
                </div>
                <div className="avatar-popover-divider" />
                <Link
                  href="/settings"
                  className="avatar-popover-item"
                  onClick={() => setPopoverOpen(false)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9 1.65 1.65 0 004.27 7.18l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.17.4.27.83.27 1.27 0 .17-.02.34-.05.51" />
                  </svg>
                  Settings
                </Link>
                <button
                  className="avatar-popover-item avatar-popover-danger"
                  onClick={() => {
                    setPopoverOpen(false);
                    signout();
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {orchOpen && <OrchestrationModal onClose={() => setOrchOpen(false)} />}
    </>
  );
}

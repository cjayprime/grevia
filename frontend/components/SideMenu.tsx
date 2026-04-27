import { useMemo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCompany } from "../context/CompanyContext";
import { useAuth } from "../context/AuthContext";
import WorkspaceModal from "./modals/Workspace";

interface SideMenuProps {
  activeTab: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function SideMenu({
  activeTab,
  isCollapsed,
  setIsCollapsed,
}: SideMenuProps) {
  const router = useRouter();
  const { workspaces, refreshWorkspaces } = useCompany();
  const { company: authCompany, signout } = useAuth();
  const [companyName, setCompanyName] = useState<string | null>("John Doe");
  const [activeWsId, setActiveWsId] = useState<number | null>(null);
  const [wsModalOpen, setWsModalOpen] = useState(false);
  const initializedWs = useRef(false);

  useEffect(() => {
    if (authCompany?.name) {
      setTimeout(() => {
        setCompanyName(authCompany.name);
      });
    }
  }, [authCompany]);

  useEffect(() => {
    if (workspaces.length > 0 && !initializedWs.current) {
      setActiveWsId(workspaces[0].workspace_id);
      initializedWs.current = true;
    }
  }, [workspaces]);

  const activeWs = useMemo(
    () => workspaces.find((w) => w.workspace_id === activeWsId) ?? null,
    [workspaces, activeWsId],
  );

  const wsLabel = useMemo(() => {
    if (!activeWs) return "No workspace";
    const parts: string[] = [];
    if (activeWs.industry) parts.push(activeWs.industry);
    if (activeWs.region) parts.push(activeWs.region);
    return parts.length
      ? parts.join(" · ")
      : `Workspace ${activeWs.workspace_id}`;
  }, [activeWs]);

  const navItems = useMemo(
    () => [
      {
        id: "double-materiality",
        label: "Double Materiality Studio",
        href: "/double-materiality",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="9.5" cy="13" r="5.5" />
            <circle cx="14.5" cy="13" r="5.5" />
            <path
              d="M19 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        ),
      },
      {
        id: "emissions-ledger",
        label: "Emission Ledger",
        href: "/emissions-ledger",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3h18v18H3zM3 9h18M9 3v18" />
          </svg>
        ),
      },
      {
        id: "p2a-mapper",
        label: "P2A Mapper",
        href: "/p2a-mapper",
        popover: "Policy to Action Mapper",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
            <path d="M3 12h12" />
            <circle cx="18" cy="12" r="3" />
          </svg>
        ),
      },
      {
        id: "hot-store",
        label: "Hot Store",
        href: "/hot-store",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        ),
      },
    ],
    [],
  );

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--nav-width",
      isCollapsed ? "64px" : "240px",
    );
  }, [isCollapsed]);

  return (
    <>
      <aside className="nav-side">
        <div className="nav-side-container">
          <div className="nav-head">
            <button
              className="nav-collapse-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  focusable="false"
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
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  focusable="false"
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
              )}
            </button>
          </div>

          {/* Workspace picker */}
          {!isCollapsed ? (
            <div className="nav-ws-picker">
              <div className="nav-ws-label">Workspace</div>

              <div className="nav-ws-select-wrap">
                <select
                  className="nav-ws-select"
                  value={activeWsId ?? ""}
                  onChange={(e) => setActiveWsId(Number(e.target.value))}
                  disabled={workspaces.length === 0}
                  title={wsLabel}
                >
                  {workspaces.length === 0 && (
                    <option value="">No workspaces</option>
                  )}
                  {workspaces.map((ws) => {
                    const parts: string[] = [];
                    if (ws.industry) parts.push(ws.industry);
                    if (ws.region) parts.push(ws.region);
                    const label = parts.length
                      ? parts.join(" · ")
                      : `Workspace ${ws.workspace_id}`;
                    return (
                      <option key={ws.workspace_id} value={ws.workspace_id}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                <svg
                  className="nav-ws-chevron"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              <button
                className="nav-ws-create"
                onClick={() => setWsModalOpen(true)}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New Workspace
              </button>
            </div>
          ) : (
            <div
              className="nav-ws-picker"
              style={{ padding: "8px 6px", alignItems: "center" }}
            >
              <button
                className="nav-ws-icon"
                title={wsLabel}
                onClick={() => setWsModalOpen(true)}
              >
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
          )}

          <nav className="nav-content">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`nav-item ${isCollapsed ? "collapsed" : ""} ${
                  router.pathname === item.href || activeTab === item.id
                    ? "active"
                    : ""
                }`}
              >
                <div className="nav-icon">{item.icon}</div>
                {!isCollapsed && (
                  <span className="nav-label">{item.label}</span>
                )}
                {isCollapsed && item.popover && (
                  <div className="nav-popover">{item.popover}</div>
                )}
                {isCollapsed && !item.popover && (
                  <div className="nav-popover">{item.label}</div>
                )}
              </Link>
            ))}
          </nav>

          <div className="nav-bottom">
            <Link
              href="/settings"
              className={`nav-item ${isCollapsed ? "collapsed" : ""} ${
                router.pathname === "/settings" ? "active" : ""
              }`}
            >
              <div className="nav-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9 1.65 1.65 0 004.27 7.18l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.17.4.27.83.27 1.27 0 .17-.02.34-.05.51" />
                </svg>
              </div>
              {!isCollapsed && <span className="nav-label">Settings</span>}
            </Link>

            {/* {companyName && !isCollapsed && (
              <div className="nav-company">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9" />
                </svg>
                <span>{companyName}</span>
              </div>
            )}

            {companyName && isCollapsed && (
              <div className="nav-item collapsed" title={companyName} style={{ cursor: "default" }}>
                <div className="nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9" />
                  </svg>
                </div>
                <div className="nav-popover">{companyName}</div>
              </div>
            )} */}

            <div className="nav-profile">
              <div className="profile-info">
                <div className="avatar">
                  {companyName?.substring(0, 1)?.toUpperCase()}
                  {companyName
                    ?.substring(companyName.length - 1, companyName.length)
                    ?.toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="profile-details">
                    <div className="profile-name">{companyName}</div>
                    <div className="profile-role">ESG Account</div>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <button
                  className="signout-btn"
                  title="Sign Out"
                  onClick={signout}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {wsModalOpen && (
        <WorkspaceModal
          onClose={() => setWsModalOpen(false)}
          onCreated={(ws) => {
            setWsModalOpen(false);
            setActiveWsId(ws.workspace_id);
            refreshWorkspaces();
          }}
        />
      )}
    </>
  );
}

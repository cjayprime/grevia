import React, { useState } from "react";

import Header from "./Header";
import SideMenu from "./SideMenu";
// import Assistant from "./Assistant";

import { useAuth } from "../context/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

export default function Layout({ children, activeTab }: LayoutProps) {
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [assistantCollapsed] = useState(true);

  const { token, loading } = useAuth();

  if (loading || !token) {
    return (
      <div className="auth-page">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  return (
    <>
      <Header title="Sustainability Intelligence Suite" />
      <div
        className={`app ${navCollapsed ? "collapsed" : ""} ${
          assistantCollapsed ? "side-collapsed" : ""
        }`}
      >
        <SideMenu
          activeTab={activeTab}
          isCollapsed={navCollapsed}
          setIsCollapsed={setNavCollapsed}
        />

        {children}

        {/* <Assistant
          isCollapsed={assistantCollapsed}
          setIsCollapsed={setAssistantCollapsed}
        /> */}
      </div>
    </>
  );
}

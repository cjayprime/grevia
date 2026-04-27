import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API, authFetch } from "../helpers";
import { useAuth } from "./AuthContext";
import type { Company, WorkspaceData } from "../types";

interface CompanyContextValue {
  company: Company | null;
  companyId: number | null;
  loading: boolean;
  reload: () => void;
  workspaces: WorkspaceData[];
  workspacesLoading: boolean;
  refreshWorkspaces: () => void;
}

const CompanyContext = createContext<CompanyContextValue>({
  company: null,
  companyId: null,
  loading: true,
  reload: () => {},
  workspaces: [],
  workspacesLoading: true,
  refreshWorkspaces: () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);

  const companyId = useMemo(() => company?.company_id ?? null, [company]);

  const load = useCallback(() => {
    if (!token) {
      setCompany(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    authFetch(`${API}/api/v1/companies/current`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCompany(data ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshWorkspaces = useCallback(() => {
    if (!companyId) {
      setWorkspaces([]);
      setWorkspacesLoading(false);
      return;
    }
    setWorkspacesLoading(true);
    authFetch(`${API}/api/v1/companies/workspace?company_id=${companyId}&is_all=true`)
      .then((r) => r.json())
      .then((data: WorkspaceData[]) => {
        if (Array.isArray(data)) setWorkspaces(data);
      })
      .catch(() => {})
      .finally(() => setWorkspacesLoading(false));
  }, [companyId]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const value = useMemo(
    () => ({
      company,
      companyId,
      loading,
      reload: load,
      workspaces,
      workspacesLoading,
      refreshWorkspaces,
    }),
    [company, companyId, loading, load, workspaces, workspacesLoading, refreshWorkspaces],
  );

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}

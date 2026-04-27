import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/router";
import { API } from "../helpers";
import type { Company } from "../types";

interface AuthContextValue {
  token: string | null;
  company: Company | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<string | null>;
  signup: (data: SignupData) => Promise<string | null>;
  signout: () => void;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  industry?: string;
  region?: string;
  country?: string;
}

const TOKEN_KEY = "grevia_token";

const PUBLIC_PATHS = ["/signin", "/signup", "/forgot-password", "/reset-password"];

const AuthContext = createContext<AuthContextValue>({
  token: null,
  company: null,
  loading: true,
  signin: async () => null,
  signup: async () => null,
  signout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  
  const persist = useCallback((t: string, c: Company) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setCompany(c);
  }, []);

  const signout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCompany(null);
    router.push("/signin");
  }, [router]);

  const signin = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const res = await fetch(`${API}/api/v1/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return err.detail || "Invalid email or password.";
        }
        const data = await res.json();
        persist(data.token, data.company);
        return null;
      } catch {
        return "Network error — please try again.";
      }
    },
    [persist],
  );

  const signup = useCallback(
    async (body: SignupData): Promise<string | null> => {
      try {
        const res = await fetch(`${API}/api/v1/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return err.detail || "Signup failed.";
        }
        const data = await res.json();
        persist(data.token, data.company);
        return null;
      } catch {
        return "Network error — please try again.";
      }
    },
    [persist],
  );

  const value = useMemo(
    () => ({ token, company, loading, signin, signup, signout }),
    [token, company, loading, signin, signup, signout],
  );

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setTimeout(() => {
        setLoading(false);
      });
      return;
    }
    setToken(stored);
    fetch(`${API}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Company) => {
        setToken(stored);
        setCompany(data);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some((p) => router.pathname.startsWith(p));
    if (!token && !isPublic) {
      router.replace("/signin");
    }
  }, [loading, token, router]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

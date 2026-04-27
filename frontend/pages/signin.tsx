import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function SignIn() {
  const router = useRouter();
  const { token, loading: authLoading, signin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && token) router.replace("/");
  }, [authLoading, token, router]);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      const err = await signin(email, password);
      if (err) {
        setError(err);
        setSubmitting(false);
      } else {
        router.push("/");
      }
    },
    [email, password, signin, router],
  );

  // if (authLoading || token) return null;

  return (
    <div className="auth-page">
      <div className="auth-bg-orbs">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>
      <div className="auth-bg-grid" />

      <div className="auth-bg-features">
        <span className="auth-bg-feature" style={{ top: "12%", left: "8%" }}>Double Materiality Studio</span>
        <span className="auth-bg-feature" style={{ top: "22%", right: "6%" }}>ESRS Compliance</span>
        <span className="auth-bg-feature" style={{ top: "42%", left: "4%" }}>Scope 1-3 Emissions</span>
        <span className="auth-bg-feature" style={{ bottom: "32%", right: "8%" }}>Policy-to-Action Mapper</span>
        <span className="auth-bg-feature" style={{ bottom: "18%", left: "12%" }}>XBRL Export</span>
        <span className="auth-bg-feature" style={{ top: "8%", left: "42%" }}>Multi-Agent AI</span>
        <span className="auth-bg-feature" style={{ bottom: "10%", right: "18%" }}>GHG Protocol</span>
        <span className="auth-bg-feature" style={{ top: "55%", right: "3%" }}>CSRD Reporting</span>
        <span className="auth-bg-feature" style={{ bottom: "42%", left: "2%" }}>Hot Store</span>
        <span className="auth-bg-feature" style={{ top: "68%", left: "18%" }}>Stakeholder Analysis</span>
      </div>

      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <div className="brand-mark" />
          <span className="auth-brand-name">
            Grevia <em>PRO</em>
          </span>
        </div>

        <h1 className="auth-title serif">Welcome back</h1>
        <p className="auth-subtitle">
          Sign in to your sustainability workspace
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="dm-field">
            <label className="dm-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="dm-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="dm-field">
            <label className="dm-label" htmlFor="password">
              Password
            </label>
            <div className="auth-password-wrap">
              <input
                id="password"
                className="dm-input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="auth-actions-row">
            <Link href="/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting || !email || !password}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="auth-footer-text">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="auth-link">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

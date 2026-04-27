import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { API } from "../helpers";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!token || typeof token !== "string") {
        setError("Invalid or missing reset token.");
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch(`${API}/api/v1/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.detail || "Reset failed. The link may have expired.");
          setSubmitting(false);
          return;
        }
        setDone(true);
      } catch {
        setError("Network error — please try again.");
      }
      setSubmitting(false);
    },
    [password, confirmPassword, token],
  );

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark" />
          <span className="auth-brand-name">
            Grevia <em>PRO</em>
          </span>
        </div>

        {done ? (
          <>
            <div className="auth-success-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="auth-title serif">Password reset</h1>
            <p className="auth-subtitle">
              Your password has been updated. You can now sign in.
            </p>
            <Link href="/signin" className="auth-submit" style={{ textAlign: "center", textDecoration: "none", display: "block", marginTop: 24 }}>
              Sign In
            </Link>
          </>
        ) : (
          <>
            <h1 className="auth-title serif">Set new password</h1>
            <p className="auth-subtitle">
              Choose a new password for your account.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <div className="auth-error">{error}</div>}

              <div className="dm-field">
                <label className="dm-label" htmlFor="new-pw">
                  New password
                </label>
                <div className="auth-password-wrap">
                  <input
                    id="new-pw"
                    className="dm-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    autoComplete="new-password"
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

              <div className="dm-field">
                <label className="dm-label" htmlFor="confirm-new-pw">
                  Confirm password
                </label>
                <input
                  id="confirm-new-pw"
                  className="dm-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={submitting || !password || !confirmPassword}
              >
                {submitting ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

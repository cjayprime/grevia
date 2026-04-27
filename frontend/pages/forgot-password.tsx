import { useCallback, useState } from "react";
import Link from "next/link";
import { API } from "../helpers";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch(`${API}/api/v1/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.detail || "Something went wrong.");
          setSubmitting(false);
          return;
        }
        setSubmitted(true);
      } catch {
        setError("Network error — please try again.");
      }
      setSubmitting(false);
    },
    [email],
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

        {submitted ? (
          <>
            <div className="auth-success-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="auth-title serif">Check your email</h1>
            <p className="auth-subtitle">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent
              password reset instructions.
            </p>
            <Link href="/signin" className="auth-submit" style={{ textAlign: "center", textDecoration: "none", display: "block", marginTop: 24 }}>
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <h1 className="auth-title serif">Reset your password</h1>
            <p className="auth-subtitle">
              Enter the email associated with your account and we&apos;ll send a
              reset link.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <div className="auth-error">{error}</div>}

              <div className="dm-field">
                <label className="dm-label" htmlFor="fp-email">
                  Email
                </label>
                <input
                  id="fp-email"
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

              <button
                type="submit"
                className="auth-submit"
                disabled={submitting || !email}
              >
                {submitting ? "Sending…" : "Send Reset Link"}
              </button>
            </form>

            <p className="auth-footer-text">
              Remember your password?{" "}
              <Link href="/signin" className="auth-link">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

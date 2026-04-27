import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

const INDUSTRIES = [
  "Energy",
  "Materials",
  "Industrials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Healthcare",
  "Financials",
  "Information Technology",
  "Communication Services",
  "Utilities",
  "Real Estate",
  "Agriculture",
  "Transportation",
  "Mining & Metals",
  "Oil & Gas",
  "Manufacturing",
  "Retail",
  "Other",
];

const REGIONS = ["Africa", "Europe", "Americas", "Asia-Pacific", "Middle East"];

export default function SignUp() {
  const router = useRouter();
  const { token, loading: authLoading, signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
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

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setSubmitting(true);
      const err = await signup({
        name,
        email,
        password,
        industry: industry || undefined,
        region: region || undefined,
        country: country || undefined,
      });
      if (err) {
        setError(err);
        setSubmitting(false);
      } else {
        router.push("/");
      }
    },
    [name, email, password, confirmPassword, industry, region, country, signup, router],
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

        <h1 className="auth-title serif">Create your account</h1>
        <p className="auth-subtitle">
          Register your company for sustainability reporting
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-row">
            <div className="dm-field">
              <label className="dm-label" htmlFor="name">
                Company name <span className="dm-required">*</span>
              </label>
              <input
                id="name"
                className="dm-input"
                type="text"
                placeholder="Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="dm-field">
              <label className="dm-label" htmlFor="signup-email">
                Email <span className="dm-required">*</span>
              </label>
              <input
                id="signup-email"
                className="dm-input"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-row">
            <div className="dm-field">
              <label className="dm-label" htmlFor="signup-password">
                Password <span className="dm-required">*</span>
              </label>
              <div className="auth-password-wrap">
                <input
                  id="signup-password"
                  className="dm-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
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
              <label className="dm-label" htmlFor="confirm-password">
                Confirm password <span className="dm-required">*</span>
              </label>
              <input
                id="confirm-password"
                className="dm-input"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="auth-divider">
            <span>Company details</span>
          </div>

          <div className="auth-row auth-row-3">
            <div className="dm-field">
              <label className="dm-label" htmlFor="industry">
                Industry
              </label>
              <select
                id="industry"
                className="dm-input"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <div className="dm-field">
              <label className="dm-label" htmlFor="region">
                Region
              </label>
              <select
                id="region"
                className="dm-input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">Select region</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="dm-field">
              <label className="dm-label" htmlFor="country">
                Country
              </label>
              <input
                id="country"
                className="dm-input"
                type="text"
                placeholder="e.g. Germany"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting || !name || !email || !password || !confirmPassword}
          >
            {submitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link href="/signin" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

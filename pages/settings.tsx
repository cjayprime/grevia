import { useCallback, useState } from "react";
import { Layout } from "../components";
import { useAuth } from "../context/AuthContext";
import { authFetch, API, extractError, notifyError, notifySuccess } from "../helpers";

export default function Settings() {
  const { company } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        notifyError("Passwords do not match.");
        return;
      }
      if (newPassword.length < 8) {
        notifyError("Password must be at least 8 characters.");
        return;
      }
      setSubmitting(true);
      try {
        const res = await authFetch(`${API}/api/v1/auth/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });
        if (!res.ok) {
          notifyError(await extractError(res));
        } else {
          notifySuccess("Password changed successfully.");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      } catch {
        notifyError("Failed to change password.");
      }
      setSubmitting(false);
    },
    [currentPassword, newPassword, confirmPassword],
  );

  return (
    <Layout activeTab="settings">
      <main className="main">
        <div className="page-head">
          <div>
            <div className="eyebrow">Preferences & Configuration</div>
            <h1 className="page-title">Settings</h1>
            <p className="page-desc">
              Manage your account and security preferences.
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <section className="settings-section">
            <h2 className="settings-section-title serif">Account</h2>
            <div className="settings-card">
              <div className="settings-field">
                <span className="settings-field-label">Company</span>
                <span className="settings-field-value">{company?.name}</span>
              </div>
              <div className="settings-field">
                <span className="settings-field-label">Email</span>
                <span className="settings-field-value">{company?.email}</span>
              </div>
              {company?.industry && (
                <div className="settings-field">
                  <span className="settings-field-label">Industry</span>
                  <span className="settings-field-value">{company.industry}</span>
                </div>
              )}
              {company?.region && (
                <div className="settings-field">
                  <span className="settings-field-label">Region</span>
                  <span className="settings-field-value">{company.region}</span>
                </div>
              )}
            </div>
          </section>

          <section className="settings-section">
            <h2 className="settings-section-title serif">Change Password</h2>
            <form className="settings-card" onSubmit={handleChangePassword}>
              <div className="dm-field">
                <label className="dm-label" htmlFor="s-current-pw">
                  Current password
                </label>
                <input
                  id="s-current-pw"
                  className="dm-input"
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="dm-field">
                <label className="dm-label" htmlFor="s-new-pw">
                  New password
                </label>
                <input
                  id="s-new-pw"
                  className="dm-input"
                  type={showPasswords ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="dm-field">
                <label className="dm-label" htmlFor="s-confirm-pw">
                  Confirm new password
                </label>
                <input
                  id="s-confirm-pw"
                  className="dm-input"
                  type={showPasswords ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="settings-pw-actions">
                <label className="settings-show-pw">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                  />
                  Show passwords
                </label>
                <button
                  type="submit"
                  className="hs-btn primary"
                  disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
                >
                  {submitting ? "Saving…" : "Update Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </Layout>
  );
}

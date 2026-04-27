import { useCallback, useMemo, useState } from "react";
import countries from "world-countries";
import { API, authFetch, extractError, notifyError } from "../../helpers";
import { useCompany } from "../../context/CompanyContext";
import type { WorkspaceData } from "../../types";

const INDUSTRIES = [
  "Agriculture",
  "Automotive",
  "Banking & Finance",
  "Chemicals",
  "Construction",
  "Consumer Goods",
  "Education",
  "Energy — Oil & Gas",
  "Energy — Renewables",
  "Food & Beverage",
  "Healthcare",
  "Hospitality & Tourism",
  "Insurance",
  "Manufacturing",
  "Media & Entertainment",
  "Mining & Metals",
  "Pharmaceuticals",
  "Real Estate",
  "Retail",
  "Technology",
  "Telecommunications",
  "Transportation & Logistics",
  "Utilities",
  "Waste Management",
];

const REGIONS = ["Africa", "Europe", "Americas", "Asia-Pacific", "Middle East"];

const COUNTRY_NAMES = countries.map((c) => c.name.common).sort();

interface WorkspaceProps {
  onClose: () => void;
  onCreated: (ws: WorkspaceData) => void;
}

interface FieldErrors {
  industry?: string;
  region?: string;
  hqCountry?: string;
  employeeCount?: string;
  annualRevenue?: string;
  businessDesc?: string;
  valueChainDescription?: string;
  stakeholders?: string;
  goals?: string;
}

const ALL_FIELDS: (keyof FieldErrors)[] = [
  "industry",
  "region",
  "hqCountry",
  "employeeCount",
  "annualRevenue",
  "businessDesc",
  "valueChainDescription",
  "stakeholders",
  "goals",
];

export default function Workspace({ onClose, onCreated }: WorkspaceProps) {
  const { companyId } = useCompany();
  const [industry, setIndustry] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [region, setRegion] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [hqCountry, setHqCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [employeeCount, setEmployeeCount] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");
  const [valueChainDescription, setValueChainDescription] = useState("");
  const [stakeholderInput, setStakeholderInput] = useState("");
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const filteredIndustries = useMemo(
    () =>
      INDUSTRIES.filter((i) =>
        i.toLowerCase().includes(industrySearch.toLowerCase()),
      ),
    [industrySearch],
  );

  const filteredRegions = useMemo(
    () =>
      REGIONS.filter((r) =>
        r.toLowerCase().includes(regionSearch.toLowerCase()),
      ),
    [regionSearch],
  );

  const filteredCountries = useMemo(
    () =>
      COUNTRY_NAMES.filter((c) =>
        c.toLowerCase().includes(countrySearch.toLowerCase()),
      ),
    [countrySearch],
  );

  const touch = useCallback((field: string) => {
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  const validate = useCallback((): FieldErrors => {
    const errs: FieldErrors = {};
    if (!industry) {
      errs.industry = "Required.";
    }

    if (!region) {
      errs.region = "Required.";
    }

    if (!hqCountry) {
      errs.hqCountry = "Required.";
    }

    if (!employeeCount) {
      errs.employeeCount = "Required.";
    } else {
      const n = parseInt(employeeCount);
      if (isNaN(n) || n <= 0) errs.employeeCount = "Must be a positive number.";
    }

    if (!annualRevenue) {
      errs.annualRevenue = "Required.";
    } else {
      const n = parseInt(annualRevenue);
      if (isNaN(n) || n <= 0) errs.annualRevenue = "Must be a positive number.";
    }

    if (!businessDesc.trim()) {
      errs.businessDesc = "Required.";
    }

    if (!valueChainDescription.trim()) {
      errs.valueChainDescription = "Required.";
    }

    if (stakeholders.length === 0) {
      errs.stakeholders = "Add at least one stakeholder.";
    }

    if (!goals.trim()) {
      errs.goals = "Required.";
    }

    console.log("Errs", errs);
    return errs;
  }, [
    industry,
    region,
    hqCountry,
    employeeCount,
    annualRevenue,
    businessDesc,
    valueChainDescription,
    stakeholders,
    goals,
  ]);

  const visibleErrors = useMemo((): FieldErrors => {
    const errs = validate();
    const visible: FieldErrors = {};
    for (const key of Object.keys(errs) as (keyof FieldErrors)[]) {
      if (touched.has(key)) visible[key] = errs[key];
    }
    return visible;
  }, [validate, touched]);

  const isValid = useMemo(
    () => Object.keys(validate()).length === 0,
    [validate],
  );

  const handleStakeholderKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && stakeholderInput.trim()) {
        e.preventDefault();
        setStakeholders((prev) => [...prev, stakeholderInput.trim()]);
        setStakeholderInput("");
        touch("stakeholders");
      }
    },
    [stakeholderInput, touch],
  );

  const removeStakeholder = useCallback((idx: number) => {
    setStakeholders((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault();

      setTouched(new Set(ALL_FIELDS));
      const errs = validate();
      if (Object.keys(errs).length > 0) {
        return;
      }

      setSubmitting(true);
      try {
        const res = await authFetch(`${API}/api/v1/companies/workspace`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: companyId,
            industry,
            region,
            hq_country: hqCountry,
            employee_count: parseInt(employeeCount),
            annual_revenue: parseInt(annualRevenue),
            business_description: businessDesc,
            value_chain_description: valueChainDescription,
            key_stakeholders: stakeholders,
            sustainability_goals: goals,
          }),
        });
        if (!res.ok) {
          notifyError(await extractError(res));
          setSubmitting(false);
          return;
        }
        const ws = await res.json();
        onCreated(ws);
      } catch {
        notifyError("Failed to create workspace");
      }
      setSubmitting(false);
    },
    [
      validate,
      industry,
      region,
      hqCountry,
      employeeCount,
      annualRevenue,
      businessDesc,
      valueChainDescription,
      stakeholders,
      goals,
      onCreated,
    ],
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal dm-workspace-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Set Up Company Workspace</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="dm-workspace-modal-body" onSubmit={handleSubmit}>
          <p className="dm-workspace-modal-desc">
            All fields are required to enable accurate materiality assessments.
          </p>

          <div className="dm-form-grid">
            {/* Industry */}
            <div
              className={`dm-field ${visibleErrors.industry ? "dm-field-invalid" : ""}`}
            >
              <label className="dm-label">
                Industry <span className="dm-required">*</span>
              </label>
              <div className="dm-searchable-select">
                <input
                  className="dm-input"
                  placeholder="Search industry…"
                  value={showIndustryDropdown ? industrySearch : industry}
                  onChange={(e) => {
                    setIndustrySearch(e.target.value);
                    setShowIndustryDropdown(true);
                  }}
                  onFocus={() => setShowIndustryDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowIndustryDropdown(false), 200);
                    touch("industry");
                  }}
                />
                {showIndustryDropdown && filteredIndustries.length > 0 && (
                  <div className="dm-dropdown">
                    {filteredIndustries.map((i) => (
                      <button
                        key={i}
                        type="button"
                        className={`dm-dropdown-item ${i === industry ? "active" : ""}`}
                        onMouseDown={() => {
                          setIndustry(i);
                          setIndustrySearch(i);
                          setShowIndustryDropdown(false);
                          touch("industry");
                        }}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {visibleErrors.industry && (
                <span className="dm-field-error">{visibleErrors.industry}</span>
              )}
            </div>

            {/* Region */}
            <div
              className={`dm-field ${visibleErrors.region ? "dm-field-invalid" : ""}`}
            >
              <label className="dm-label">
                Region <span className="dm-required">*</span>
              </label>
              <div className="dm-searchable-select">
                <input
                  className="dm-input"
                  placeholder="Search region…"
                  value={showRegionDropdown ? regionSearch : region}
                  onChange={(e) => {
                    setRegionSearch(e.target.value);
                    setShowRegionDropdown(true);
                  }}
                  onFocus={() => setShowRegionDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowRegionDropdown(false), 200);
                    touch("region");
                  }}
                />
                {showRegionDropdown && filteredRegions.length > 0 && (
                  <div className="dm-dropdown">
                    {filteredRegions.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`dm-dropdown-item ${r === region ? "active" : ""}`}
                        onMouseDown={() => {
                          setRegion(r);
                          setRegionSearch(r);
                          setShowRegionDropdown(false);
                          touch("region");
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {visibleErrors.region && (
                <span className="dm-field-error">{visibleErrors.region}</span>
              )}
            </div>

            {/* HQ Country */}
            <div
              className={`dm-field ${visibleErrors.hqCountry ? "dm-field-invalid" : ""}`}
            >
              <label className="dm-label">
                HQ Country <span className="dm-required">*</span>
              </label>
              <div className="dm-searchable-select">
                <input
                  className="dm-input"
                  placeholder="Search country…"
                  value={showCountryDropdown ? countrySearch : hqCountry}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setShowCountryDropdown(true);
                  }}
                  onFocus={() => setShowCountryDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowCountryDropdown(false), 200);
                    touch("hqCountry");
                  }}
                />
                {showCountryDropdown && filteredCountries.length > 0 && (
                  <div className="dm-dropdown">
                    {filteredCountries.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`dm-dropdown-item ${c === hqCountry ? "active" : ""}`}
                        onMouseDown={() => {
                          setHqCountry(c);
                          setCountrySearch(c);
                          setShowCountryDropdown(false);
                          touch("hqCountry");
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {visibleErrors.hqCountry && (
                <span className="dm-field-error">
                  {visibleErrors.hqCountry}
                </span>
              )}
            </div>

            {/* Employee Count */}
            <div
              className={`dm-field ${visibleErrors.employeeCount ? "dm-field-invalid" : ""}`}
            >
              <label className="dm-label">
                Employee Count <span className="dm-required">*</span>
              </label>
              <input
                className="dm-input"
                type="number"
                min="1"
                placeholder="e.g. 5000"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                onBlur={() => touch("employeeCount")}
                style={{ maxWidth: 215 }}
              />
              {visibleErrors.employeeCount && (
                <span className="dm-field-error">
                  {visibleErrors.employeeCount}
                </span>
              )}
            </div>

            {/* Annual Revenue */}
            <div
              className={`dm-field ${visibleErrors.annualRevenue ? "dm-field-invalid" : ""}`}
            >
              <label className="dm-label">
                Annual Revenue (USD) <span className="dm-required">*</span>
              </label>
              <input
                className="dm-input"
                type="number"
                min="1"
                placeholder="e.g. 50000000"
                value={annualRevenue}
                onChange={(e) => setAnnualRevenue(e.target.value)}
                onBlur={() => touch("annualRevenue")}
                style={{ maxWidth: 215 }}
              />
              {visibleErrors.annualRevenue && (
                <span className="dm-field-error">
                  {visibleErrors.annualRevenue}
                </span>
              )}
            </div>
          </div>

          {/* Business Description */}
          <div
            className={`dm-field dm-field-full ${visibleErrors.businessDesc ? "dm-field-invalid" : ""}`}
          >
            <label className="dm-label">
              Business Description <span className="dm-required">*</span>
            </label>
            <textarea
              className="dm-textarea"
              rows={3}
              placeholder="Describe what the company does, its core products/services…"
              value={businessDesc}
              onChange={(e) => setBusinessDesc(e.target.value)}
              onBlur={() => touch("businessDesc")}
            />
            {visibleErrors.businessDesc && (
              <span className="dm-field-error">
                {visibleErrors.businessDesc}
              </span>
            )}
          </div>

          {/* Value Chain Description */}
          <div
            className={`dm-field dm-field-full ${visibleErrors.valueChainDescription ? "dm-field-invalid" : ""}`}
          >
            <label className="dm-label">
              Value Chain Description <span className="dm-required">*</span>
            </label>
            <textarea
              className="dm-textarea"
              rows={3}
              placeholder="Describe the company's upstream and downstream value chain…"
              value={valueChainDescription}
              onChange={(e) => setValueChainDescription(e.target.value)}
              onBlur={() => touch("valueChainDesc")}
            />
            {visibleErrors.valueChainDescription && (
              <span className="dm-field-error">
                {visibleErrors.valueChainDescription}
              </span>
            )}
          </div>

          {/* Key Stakeholders */}
          <div
            className={`dm-field dm-field-full ${visibleErrors.stakeholders ? "dm-field-invalid" : ""}`}
          >
            <label className="dm-label">
              Key Stakeholders <span className="dm-required">*</span>
            </label>
            <div
              className={`dm-tag-input ${visibleErrors.stakeholders ? "dm-tag-input-invalid" : ""}`}
            >
              {stakeholders.map((s, i) => (
                <span key={i} className="dm-tag">
                  {s}
                  <button type="button" onClick={() => removeStakeholder(i)}>
                    x
                  </button>
                </span>
              ))}
              <input
                placeholder="Type and press Enter…"
                value={stakeholderInput}
                onChange={(e) => setStakeholderInput(e.target.value)}
                onKeyDown={handleStakeholderKeyDown}
                onBlur={() => touch("stakeholders")}
              />
            </div>
            {visibleErrors.stakeholders && (
              <span className="dm-field-error">
                {visibleErrors.stakeholders}
              </span>
            )}
          </div>

          {/* Sustainability Goals */}
          <div
            className={`dm-field dm-field-full ${visibleErrors.goals ? "dm-field-invalid" : ""}`}
          >
            <label className="dm-label">
              Sustainability Goals <span className="dm-required">*</span>
            </label>
            <textarea
              className="dm-textarea"
              rows={3}
              placeholder="Key sustainability targets, net-zero commitments, etc."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              onBlur={() => touch("goals")}
            />
            {visibleErrors.goals && (
              <span className="dm-field-error">{visibleErrors.goals}</span>
            )}
          </div>

          <div className="dm-workspace-modal-footer">
            <button type="button" className="hs-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="hs-btn primary"
              disabled={!isValid || submitting}
            >
              {submitting ? "Creating…" : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

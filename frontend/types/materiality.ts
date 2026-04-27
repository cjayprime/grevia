export type Standard = "ESRS" | "GRI" | "SASB" | "TCFD" | "ISSB";

export type VizTab = "quadrant" | "matrix";

export type Confidence = "low" | "medium" | "high";

export interface MaterialityTopic {
  topic_id: string;
  name: string;
  esrs_reference: string;
  financial_impact_score: number;
  impact_risk_score: number;
  description: string;
  justification: string;
  short_justification: string;
  affected_stakeholders: string[];
  data_gaps: string[];
  confidence: Confidence;
}

export interface MaterialityBreakdown {
  materiality_assessment_breakdown_id: number;
  topic: "Environment" | "Social" | "Governance";
  sub_topic: string;
  disclosure_requirement: string;
  description: string;
  policies: string[];
  processes: string[];
  strategies: string[];
  impact_risk_opportunities: string;
  metric_target: number;
  metric_description: string;
  metric_unit: string;
  financial_materiality_score: number;
  impact_materiality_score: number;
  recommendations: string;
}

export interface MaterialityAssessment {
  materiality_assessment_id: number;
  company_id: number;
  workspace_id: number | null;
  profile: Record<string, unknown> | null;
  standard: Standard;
  industry: string | null;
  region: string | null;
  hot_store_ids: number[] | null;
  assessment_data: MaterialityTopic[] | null;
  breakdowns: MaterialityBreakdown[] | null;
  status: "processing" | "ready" | "error";
  date: string;
}

export interface WorkspaceData {
  workspace_id: number;
  company_id: number;
  industry: string | null;
  region: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  hq_country: string | null;
  business_description: string | null;
  value_chain_description: string | null;
  key_stakeholders: string[] | null;
  sustainability_goals: string | null;
  date: string;
}

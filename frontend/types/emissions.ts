export type EmissionConfidence = "low" | "medium" | "high";
export type EmissionStatus = "ok" | "gap" | "outlier" | "unverified";

export interface EmissionRecord {
  emission_record_id: number;
  company_id: number;
  year: number;
  period: string;
  scope: number;
  category: string;
  tco2e: number | null;
  percentage_of_total: number | null;
  confidence: EmissionConfidence;
  status: EmissionStatus;
  esrs_reference: string | null;
  gri_reference: string | null;
  tcfd_reference: string | null;
  issb_reference: string | null;
  source_document_id: number | null;
  narrative_disclosure: string | null;
  date: string;
}

export interface TimelineBucket {
  period: string;
  scope1: number;
  scope2: number;
  scope3: number;
}

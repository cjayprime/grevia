export type FileType =
  | "PDF"
  | "DOCX"
  | "XLSX"
  | "CSV"
  | "TXT"
  | "OTHER";

export interface Doc {
  hot_store_id: number;
  company_id: number;
  file_name: string;
  original_filename: string;
  file_type: FileType;
  category: Category;
  file_path: string;
  file_size: number;
  date: string;
  is_hot_report: boolean;
  report_prompts: Record<string, unknown> | null;
  status: string;
  deleted: boolean;
  detailed_description: string | null;
}

export interface ListResponse {
  documents: Doc[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export type Category =
  | "all"
  | "policy"
  | "report"
  | "legal"
  | "contract"
  | "financial"
  | "other";

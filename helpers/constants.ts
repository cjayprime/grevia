export const CATEGORIES = [
  "all",
  "policy",
  "report",
  "legal",
  "contract",
  "financial",
  "other",
] as const;

export const FILE_TYPES = [
  "PDF",
  "DOCX",
  "XLSX",
  "CSV",
  "JPG",
  "PNG",
  "TXT",
] as const;

export const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  PDF: { icon: "\u{1F4D5}", color: "#e74c3c" },
  DOCX: { icon: "\u{1F4D8}", color: "#2980b9" },
  XLSX: { icon: "\u{1F4D7}", color: "#27ae60" },
  CSV: { icon: "\u{1F4CA}", color: "#16a085" },
  TXT: { icon: "\u{1F4C4}", color: "#7f8c8d" },
  JPG: { icon: "\u{1F5BC}️", color: "#e67e22" },
  PNG: { icon: "\u{1F5BC}️", color: "#e67e22" },
  OTHER: { icon: "\u{1F4CE}", color: "#95a5a6" },
};

import { CATEGORIES, FILE_TYPES, FILE_ICONS } from "../helpers/constants";

describe("CATEGORIES", () => {
  it("includes all expected categories", () => {
    const expected = ["all", "policy", "report", "legal", "contract", "financial", "other"];
    expected.forEach((cat) => expect(CATEGORIES).toContain(cat));
  });

  it("has no duplicates", () => {
    const unique = new Set(CATEGORIES);
    expect(unique.size).toBe(CATEGORIES.length);
  });
});

describe("FILE_TYPES", () => {
  it("includes all major document types", () => {
    ["PDF", "DOCX", "XLSX", "CSV", "TXT"].forEach((t) =>
      expect(FILE_TYPES).toContain(t)
    );
  });
});

describe("FILE_ICONS", () => {
  it("has an entry for each file type", () => {
    ["PDF", "DOCX", "XLSX", "CSV", "TXT"].forEach((t) => {
      expect(FILE_ICONS[t]).toBeDefined();
      expect(typeof FILE_ICONS[t].icon).toBe("string");
      expect(typeof FILE_ICONS[t].color).toBe("string");
    });
  });

  it("has a fallback OTHER entry", () => {
    expect(FILE_ICONS.OTHER).toBeDefined();
    expect(FILE_ICONS.OTHER.icon).toBeTruthy();
  });

  it("each color is a valid hex string", () => {
    Object.values(FILE_ICONS).forEach(({ color }) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    });
  });
});

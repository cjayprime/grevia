import { formatBytes, formatDate } from "../helpers/format";

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes under 1 KB", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(2621440)).toBe("2.5 MB");
  });

  it("formats exactly 1023 bytes as B", () => {
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats exactly 1048575 bytes as KB", () => {
    expect(formatBytes(1048575)).toMatch(/KB$/);
  });
});

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatDate("2024-01-15T00:00:00.000Z");
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/15/);
  });

  it("returns a non-empty string for any valid date", () => {
    const result = formatDate("2023-12-31");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

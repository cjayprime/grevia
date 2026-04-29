/**
 * Tests for helpers/api.ts
 * authFetch is tested with a mocked global fetch and localStorage.
 */

// Polyfill localStorage for jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

import { authFetch } from "../helpers/api";

const TOKEN_KEY = "grevia_token";

beforeEach(() => {
  localStorageMock.clear();
  global.fetch = jest.fn().mockResolvedValue(new Response("ok", { status: 200 }));
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("authFetch", () => {
  it("calls fetch with the given URL", async () => {
    await authFetch("https://api.example.com/test");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.any(Object)
    );
  });

  it("adds Authorization header when token is in localStorage", async () => {
    localStorageMock.setItem(TOKEN_KEY, "my-jwt-token");
    await authFetch("https://api.example.com/data");

    const call = (global.fetch as jest.Mock).mock.calls[0];
    const headers: Headers = call[1].headers;
    expect(headers.get("Authorization")).toBe("Bearer my-jwt-token");
  });

  it("does not add Authorization header when no token", async () => {
    await authFetch("https://api.example.com/public");

    const call = (global.fetch as jest.Mock).mock.calls[0];
    const headers: Headers = call[1].headers;
    expect(headers.get("Authorization")).toBeNull();
  });

  it("merges custom headers with auth header", async () => {
    localStorageMock.setItem(TOKEN_KEY, "abc123");
    await authFetch("https://api.example.com/data", {
      headers: { "Content-Type": "application/json" },
    });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    const headers: Headers = call[1].headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer abc123");
  });

  it("passes through method and body", async () => {
    await authFetch("https://api.example.com/post", {
      method: "POST",
      body: JSON.stringify({ key: "value" }),
    });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[1].method).toBe("POST");
    expect(call[1].body).toBe('{"key":"value"}');
  });
});

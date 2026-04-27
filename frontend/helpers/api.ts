export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "grevia_token";

export function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

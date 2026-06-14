// API client บางๆ สำหรับเรียก Go backend (แนบ Supabase access token เป็น Bearer)

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

/** เรียก backend ใต้ /api/v1 — คืน null เมื่อ 204, โยน Error เมื่อสถานะ >= 400 */
export async function apiFetch<T = unknown>(
  token: string | null,
  path: string,
  opts: RequestInit = {},
): Promise<T | null> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(opts.headers ?? {}),
    },
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export function apiBaseUrl() {
  return BASE;
}

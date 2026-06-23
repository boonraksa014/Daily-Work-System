// api.ts — ตัวเรียก Go backend (แนบ token ของผู้ใช้เป็น Bearer ให้อัตโนมัติ)
// ที่อยู่ backend มาจาก env NEXT_PUBLIC_API_URL (ถ้าไม่ตั้ง = localhost:8080 ตอน dev)
// แก้ที่อยู่ backend: ตั้งค่า env ที่ Vercel (production) หรือ .env.local (เครื่องตัวเอง) — ไม่ต้องแก้ในไฟล์นี้

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

// เผื่อ backend (Render free tier) "ตื่น" จากโหมดประหยัด ~80 วิ — ตั้ง timeout ให้ยาวพอ
// แต่ไม่ปล่อยให้ค้างตลอดไป ถ้าเกินนี้ถือว่าเชื่อมต่อไม่สำเร็จ แล้วเด้งหน้า "ลองใหม่"
const REQUEST_TIMEOUT_MS = 90_000;

/** เรียก backend ใต้ /api/v1 — คืน null เมื่อ 204, โยน Error เมื่อสถานะ >= 400 หรือหมดเวลา */
export async function apiFetch<T = unknown>(
  token: string | null,
  path: string,
  opts: RequestInit = {},
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/api/v1${path}`, {
      ...opts,
      signal: controller.signal,
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
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ (หมดเวลา) — เซิร์ฟเวอร์อาจกำลังตื่นจากโหมดประหยัด ลองใหม่อีกครั้ง");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function apiBaseUrl() {
  return BASE;
}

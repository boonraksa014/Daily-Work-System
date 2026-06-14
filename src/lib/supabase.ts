import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true เมื่อมี env ครบ (ตั้งค่าใน .env.local) */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** browser client — null ถ้ายังไม่ได้ตั้งค่า env (กันแอป crash ตอน dev) */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

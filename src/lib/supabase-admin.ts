import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** server-only client (service role) — ใช้สำหรับงาน admin เท่านั้น ห้าม import ฝั่ง client */
export const supabaseAdmin: SupabaseClient | null = url && serviceKey
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

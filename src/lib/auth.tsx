"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Role = "admin" | "user";

function roleOf(user: User | null): Role {
  return (user?.app_metadata?.role as Role) === "admin" ? "admin" : "user";
}

interface AuthContextValue {
  user: User | null;
  role: Role;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** access token ปัจจุบัน (ใช้เรียก API ฝั่งเซิร์ฟเวอร์) */
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    // คงค่า reference ของ user เดิมไว้ถ้า id ไม่เปลี่ยน — กัน re-render/effect ทำงานใหม่
    // ตอน Supabase ยิง event refresh token (เช่นตอนสลับแท็บกลับมา)
    const apply = (u: User | null) => setUser(prev => (prev?.id === u?.id ? prev : u));
    supabase.auth.getSession().then(({ data }) => {
      apply(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "ยังไม่ได้ตั้งค่า Supabase" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);
  const signOut = useCallback(async () => { await supabase?.auth.signOut(); }, []);
  const getToken = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const role = roleOf(user);

  return (
    <AuthContext.Provider value={{ user, role, isAdmin: role === "admin", loading, signIn, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องใช้ภายใน <AuthProvider>");
  return ctx;
}

"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--wt-page)", fontFamily: "Nunito, 'Nunito Sans', system-ui, sans-serif" }}>
      {children}
    </div>
  );
}

function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    const fn = mode === "login" ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) { setError(error); return; }
    if (mode === "signup") setInfo("สมัครสำเร็จ! ถ้าเปิดยืนยันอีเมลไว้ ให้เช็คกล่องจดหมายก่อนเข้าสู่ระบบ");
  }

  const inputStyle: React.CSSProperties = { border: "2px solid var(--wt-border)", background: "var(--wt-soft)", color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.9rem" };

  return (
    <Screen>
      <div className="w-full max-w-sm bg-white rounded-2xl p-6" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 12px 40px rgba(124,58,237,0.12)" }}>
        <div className="flex flex-col items-center text-center mb-5">
          <Logo iconSize={40} />
          <p className="mt-3" style={{ fontSize: "0.85rem", color: "var(--wt-muted)", fontWeight: 600 }}>
            {mode === "login" ? "เข้าสู่ระบบเพื่อใช้งานข้อมูลของคุณ" : "สร้างบัญชีใหม่"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล"
            className="w-full px-4 py-3 rounded-xl outline-none transition-colors" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#a78bfa")} onBlur={e => (e.target.style.borderColor = "var(--wt-border)")} />
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
            className="w-full px-4 py-3 rounded-xl outline-none transition-colors" style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#a78bfa")} onBlur={e => (e.target.style.borderColor = "var(--wt-border)")} />

          {error && <p style={{ fontSize: "0.8rem", color: "#e11d48", fontWeight: 600 }}>{error}</p>}
          {info && <p style={{ fontSize: "0.8rem", color: "var(--wt-c-done-ink)", fontWeight: 600 }}>{info}</p>}

          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl transition-opacity"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.9rem", fontWeight: 800, border: "none", boxShadow: "0 4px 14px rgba(124,58,237,0.35)", opacity: busy ? 0.6 : 1 }}>
            {busy ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </form>

        <button onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setError(null); setInfo(null); }}
          className="w-full mt-4" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#7c3aed" }}>
          {mode === "login" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ"}
        </button>
      </div>
    </Screen>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <Screen>
        <div className="w-full max-w-md bg-white rounded-2xl p-6 text-center" style={{ border: "2px solid var(--wt-border)" }}>
          <p style={{ fontSize: "1.5rem" }}>🔌</p>
          <p className="mt-2" style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--wt-text)" }}>ยังไม่ได้ตั้งค่า Supabase</p>
          <p className="mt-1" style={{ fontSize: "0.82rem", color: "var(--wt-muted)" }}>
            ใส่ <code>NEXT_PUBLIC_SUPABASE_URL</code> และ <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ใน <code>.env.local</code> แล้วรีสตาร์ท dev server
          </p>
        </div>
      </Screen>
    );
  }

  if (loading) {
    return <div style={{ height: "100vh", background: "var(--wt-page)" }} aria-hidden />;
  }

  if (!user) return <LoginScreen />;

  return <>{children}</>;
}

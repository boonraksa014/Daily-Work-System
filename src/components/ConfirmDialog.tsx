"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

/** ใช้แทน window.confirm — คืน Promise<boolean> */
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => setState({ opts, resolve }));
  }, []);

  const close = useCallback((ok: boolean) => {
    setState((s) => { s?.resolve(ok); return null; });
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  const opts = state?.opts;
  const danger = opts?.danger;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && opts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(45,31,110,0.4)", backdropFilter: "blur(6px)" }}
          onClick={() => close(false)}>
          <div role="alertdialog" aria-modal="true" aria-label={opts.title} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-6"
            style={{ border: "2px solid var(--wt-border)", boxShadow: "0 16px 50px rgba(45,31,110,0.25)", animation: "wt-pop-in 0.14s cubic-bezier(0.22,1,0.36,1)" }}>
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 40, height: 40, fontSize: "1.2rem", background: danger ? "#fff1f2" : "var(--wt-soft2)" }}>
                {danger ? "⚠️" : "❓"}
              </span>
              <div className="min-w-0">
                <p style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--wt-text)" }}>{opts.title}</p>
                {opts.message && <p className="mt-1" style={{ fontSize: "0.84rem", color: "var(--wt-muted)", lineHeight: 1.5 }}>{opts.message}</p>}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => close(false)} className="flex-1 py-2.5 rounded-xl transition-colors"
                style={{ border: "2px solid var(--wt-border)", color: "var(--wt-muted)", fontSize: "0.88rem", fontWeight: 700, background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--wt-soft2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                {opts.cancelLabel ?? "ยกเลิก"}
              </button>
              <button type="button" autoFocus onClick={() => close(true)} className="flex-1 py-2.5 rounded-xl transition-opacity"
                style={{
                  color: "#fff", fontSize: "0.88rem", fontWeight: 800, border: "none",
                  background: danger ? "linear-gradient(135deg, #e11d48, #fb7185)" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                  boxShadow: danger ? "0 4px 14px rgba(225,29,72,0.35)" : "0 4px 14px rgba(124,58,237,0.35)",
                }}>
                {opts.confirmLabel ?? "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

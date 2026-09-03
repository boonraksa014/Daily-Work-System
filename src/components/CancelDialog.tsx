"use client";

// CancelDialog — popup ยืนยันการ "ยกเลิกงาน" พร้อมช่องกรอกหมายเหตุ
import { useState, useEffect } from "react";
import { Ban } from "lucide-react";

interface Props {
  title: string;                       // ชื่องาน/รายการที่จะยกเลิก
  onConfirm: (note: string) => void;   // note = หมายเหตุ (อาจว่าง)
  onClose: () => void;
}

export function CancelDialog({ title, onConfirm, onClose }: Props) {
  const [note, setNote] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(45,31,110,0.4)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="ยกเลิกงาน" onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl p-6"
        style={{ border: "2px solid var(--wt-border)", boxShadow: "0 16px 50px rgba(45,31,110,0.25)", animation: "wt-pop-in 0.14s cubic-bezier(0.22,1,0.36,1)" }}>
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, background: "#fff1f2", color: "#e11d48" }}>
            <Ban size={20} />
          </span>
          <div className="min-w-0">
            <p style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--wt-text)" }}>ยกเลิกงานนี้?</p>
            <p className="mt-1 truncate" style={{ fontSize: "0.84rem", color: "var(--wt-muted)" }} title={title}>“{title}”</p>
          </div>
        </div>

        <label htmlFor="cancel-note" className="block mt-4" style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          หมายเหตุการยกเลิก
        </label>
        <textarea id="cancel-note" value={note} onChange={e => setNote(e.target.value)} autoFocus rows={3}
          placeholder="เหตุผลที่ยกเลิกงานนี้ (ไม่บังคับ)..."
          className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none resize-none transition-colors"
          style={{ border: "2px solid var(--wt-border)", background: "var(--wt-soft)", color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.88rem" }}
          onFocus={e => (e.target.style.borderColor = "#a78bfa")} onBlur={e => (e.target.style.borderColor = "var(--wt-border)")} />

        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl transition-colors"
            style={{ border: "2px solid var(--wt-border)", color: "var(--wt-muted)", fontSize: "0.88rem", fontWeight: 700, background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            ปิด
          </button>
          <button type="button" onClick={() => onConfirm(note.trim())} className="flex-1 py-2.5 rounded-xl transition-opacity"
            style={{ color: "#fff", fontSize: "0.88rem", fontWeight: 800, border: "none", background: "linear-gradient(135deg, #e11d48, #fb7185)", boxShadow: "0 4px 14px rgba(225,29,72,0.35)" }}>
            ยืนยันยกเลิกงาน
          </button>
        </div>
      </div>
    </div>
  );
}

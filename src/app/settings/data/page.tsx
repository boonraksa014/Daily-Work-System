"use client";

import { useRef, useState } from "react";
import { Download, Upload, RotateCcw, Sparkles } from "lucide-react";
import { useData, type BackupData } from "@/lib/store";
import { useConfirm } from "@/components/ConfirmDialog";
import { todayStr } from "@/lib/date";

export default function DataSettingsPage() {
  const { tasks, logEntries, categories, tags, projects, exportData, importData, resetData, addSampleData } = useData();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function handleExport() {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taskflow-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ kind: "ok", text: "ส่งออกข้อมูลเรียบร้อย" });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<BackupData>;
      if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.logEntries)) {
        throw new Error("รูปแบบไฟล์ไม่ถูกต้อง");
      }
      if (!(await confirm({ title: "นำเข้าข้อมูล?", message: "ข้อมูลปัจจุบันทั้งหมดจะถูกเขียนทับด้วยไฟล์นี้", confirmLabel: "นำเข้า", danger: true }))) return;
      importData({
        tasks: parsed.tasks,
        logEntries: parsed.logEntries,
        categories: parsed.categories ?? categories,
        tags: parsed.tags ?? tags,
        projects: parsed.projects ?? projects,
        settings: parsed.settings ?? exportData().settings,
      });
      setMsg({ kind: "ok", text: "นำเข้าข้อมูลเรียบร้อย" });
    } catch (err) {
      setMsg({ kind: "err", text: `นำเข้าไม่สำเร็จ: ${err instanceof Error ? err.message : "ไฟล์เสียหาย"}` });
    }
  }

  async function handleReset() {
    if (!(await confirm({ title: "รีเซ็ตข้อมูลทั้งหมด?", message: "ลบงาน บันทึก และหมวดหมู่ทั้งหมด แล้วคืนค่าตัวอย่างเริ่มต้น", confirmLabel: "รีเซ็ต", danger: true }))) return;
    resetData();
    setMsg({ kind: "ok", text: "รีเซ็ตข้อมูลเป็นค่าเริ่มต้นแล้ว" });
  }

  async function handleSample() {
    if (!(await confirm({ title: "เติมข้อมูลตัวอย่าง?", message: "เพิ่มงานหลายสถานะ + บันทึกย้อนหลัง ~10 วัน เข้าไปในข้อมูลปัจจุบัน (เอาออกได้ด้วยปุ่มรีเซ็ต)", confirmLabel: "เติมข้อมูล" }))) return;
    addSampleData();
    setMsg({ kind: "ok", text: "เติมข้อมูลตัวอย่างแล้ว — ลองเปิดหน้ารายงาน / Kanban / บันทึกรายวันดูได้เลย" });
  }

  const rowStyle: React.CSSProperties = { border: "1px solid var(--wt-border)", background: "var(--wt-card)" };

  return (
    <div className="mx-auto" style={{ maxWidth: 720 }}>
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--wt-text)" }}>ข้อมูล</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>
          ข้อมูลซิงก์กับเซิร์ฟเวอร์ของบัญชีคุณ ({tasks.length} งาน · {logEntries.length} บันทึก · {categories.length} หมวดหมู่) — ส่งออกไฟล์ไว้สำรองเพิ่มได้
        </p>

        {msg && (
          <div className="mt-4 rounded-xl px-4 py-2.5" style={{ fontSize: "0.82rem", fontWeight: 700,
            background: msg.kind === "ok" ? "var(--wt-tint-green)" : "#fff1f2",
            color: msg.kind === "ok" ? "var(--wt-c-done-ink)" : "#e11d48" }}>
            {msg.text}
          </div>
        )}

        <div className="space-y-2.5 mt-4">
          {/* Export */}
          <div className="flex items-center gap-3 rounded-2xl p-3.5" style={rowStyle}>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "var(--wt-tint-blue)", color: "var(--wt-c-todo-ink)" }}><Download size={17} /></span>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--wt-text)" }}>ส่งออกข้อมูล</p>
              <p style={{ fontSize: "0.74rem", color: "var(--wt-muted)" }}>ดาวน์โหลดทั้งหมดเป็นไฟล์ JSON</p>
            </div>
            <button onClick={handleExport} className="px-3.5 py-2 rounded-xl shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.82rem", fontWeight: 800, border: "none" }}>
              ส่งออก
            </button>
          </div>

          {/* Import */}
          <div className="flex items-center gap-3 rounded-2xl p-3.5" style={rowStyle}>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "var(--wt-tint-green)", color: "var(--wt-c-done-ink)" }}><Upload size={17} /></span>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--wt-text)" }}>นำเข้าข้อมูล</p>
              <p style={{ fontSize: "0.74rem", color: "var(--wt-muted)" }}>เขียนทับด้วยไฟล์สำรอง (.json)</p>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="px-3.5 py-2 rounded-xl shrink-0"
              style={{ background: "var(--wt-soft2)", color: "var(--wt-text)", fontSize: "0.82rem", fontWeight: 800, border: "1px solid var(--wt-border)" }}>
              เลือกไฟล์
            </button>
          </div>

          {/* Sample data (for testing) */}
          <div className="flex items-center gap-3 rounded-2xl p-3.5" style={rowStyle}>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "#7c3aed22", color: "#7c3aed" }}><Sparkles size={17} /></span>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--wt-text)" }}>เติมข้อมูลตัวอย่าง</p>
              <p style={{ fontSize: "0.74rem", color: "var(--wt-muted)" }}>สร้างงาน + บันทึกย้อนหลังไว้ทดสอบหน้าต่างๆ</p>
            </div>
            <button onClick={handleSample} className="px-3.5 py-2 rounded-xl shrink-0"
              style={{ background: "var(--wt-soft2)", color: "#7c3aed", fontSize: "0.82rem", fontWeight: 800, border: "1px solid var(--wt-border)" }}>
              เติมข้อมูล
            </button>
          </div>

          {/* Reset */}
          <div className="flex items-center gap-3 rounded-2xl p-3.5" style={{ border: "1px solid #fecdd3", background: "var(--wt-card)" }}>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "#fff1f2", color: "#e11d48" }}><RotateCcw size={17} /></span>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--wt-text)" }}>รีเซ็ตข้อมูล</p>
              <p style={{ fontSize: "0.74rem", color: "var(--wt-muted)" }}>ลบทั้งหมดและคืนค่าตัวอย่างเริ่มต้น</p>
            </div>
            <button onClick={handleReset} className="px-3.5 py-2 rounded-xl shrink-0"
              style={{ background: "transparent", color: "#e11d48", fontSize: "0.82rem", fontWeight: 800, border: "1px solid #fecdd3" }}>
              รีเซ็ต
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useData } from "@/lib/store";

export default function TagsSettingsPage() {
  const { tasks, renameTag, removeTag } = useData();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const tags = Array.from(new Set(tasks.flatMap(t => t.tags))).sort();
  const usageOf = (tag: string) => tasks.filter(t => t.tags.includes(tag)).length;

  function startEdit(tag: string) { setEditing(tag); setDraft(tag); }
  function commitEdit(tag: string) {
    const next = draft.trim();
    if (next && next !== tag) renameTag(tag, next);
    setEditing(null);
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 720 }}>
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--wt-text)" }}>แท็ก</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>แท็กทั้งหมดที่ใช้ในงาน Kanban — เปลี่ยนชื่อหรือลบจะมีผลกับทุกงาน</p>

        <div className="space-y-2 mt-4">
          {tags.length === 0 && (
            <div className="text-center py-10" style={{ color: "var(--wt-muted)" }}>
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--wt-text)" }}>ยังไม่มีแท็ก</p>
              <p style={{ fontSize: "0.8rem", marginTop: 2 }}>เพิ่มแท็กได้ตอนสร้าง/แก้ไขงานในหน้า Kanban</p>
            </div>
          )}

          {tags.map(tag => (
            <div key={tag} className="group flex items-center gap-3 rounded-2xl p-3"
              style={{ border: "1px solid var(--wt-border)", background: "var(--wt-card)" }}>
              {editing === tag ? (
                <>
                  <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === "Enter") commitEdit(tag); if (e.key === "Escape") setEditing(null); }}
                    className="flex-1 px-3 py-2 rounded-xl outline-none"
                    style={{ border: "2px solid #a78bfa", background: "var(--wt-soft)", color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.88rem" }} />
                  <button onClick={() => commitEdit(tag)} aria-label="บันทึก" className="p-2 rounded-xl" style={{ color: "#059669" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(5,150,105,0.1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditing(null)} aria-label="ยกเลิก" className="p-2 rounded-xl" style={{ color: "var(--wt-muted)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="rounded-full px-3 py-1" style={{ background: "var(--wt-soft2)", color: "var(--wt-text)", fontSize: "0.82rem", fontWeight: 700 }}>#{tag}</span>
                  <span className="flex-1" style={{ fontSize: "0.74rem", color: "var(--wt-muted)" }}>ใช้ใน {usageOf(tag)} งาน</span>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(tag)} aria-label={`เปลี่ยนชื่อ ${tag}`} className="p-2 rounded-xl" style={{ color: "var(--wt-muted)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => removeTag(tag)} aria-label={`ลบ ${tag}`} className="p-2 rounded-xl" style={{ color: "#f43f5e" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.1)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

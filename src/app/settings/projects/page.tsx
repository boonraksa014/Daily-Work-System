"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from "lucide-react";
import { useData } from "@/lib/store";
import type { Project } from "@/types";

const inputStyle: React.CSSProperties = {
  border: "2px solid var(--wt-border)", background: "var(--wt-soft)",
  color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.9rem",
};

interface ProjectFormProps {
  initial?: Project;
  onSave: (data: Omit<Project, "id">) => void;
  onCancel: () => void;
}

function ProjectForm({ initial, onSave, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#7c3aed");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, isActive: initial?.isActive ?? true });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl p-4 flex flex-wrap items-end gap-3" style={{ background: "var(--wt-soft)", border: "2px solid #a78bfa" }}>
      <div className="flex-1" style={{ minWidth: 160 }}>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>ชื่อโปรเจกต์ *</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="เช่น เว็บไซต์ลูกค้า A"
          className="block w-full mt-1 px-3 py-2.5 rounded-xl outline-none" style={inputStyle} />
      </div>
      <div>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>สี</label>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} aria-label="สีโปรเจกต์"
          className="block mt-1 rounded-xl" style={{ width: 56, height: 42, border: "2px solid var(--wt-border)", background: "var(--wt-soft)", cursor: "pointer", padding: 2 }} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl" style={{ border: "2px solid var(--wt-border)", color: "var(--wt-muted)", fontSize: "0.85rem", fontWeight: 700, background: "transparent" }}>ยกเลิก</button>
        <button type="submit" disabled={!name.trim()} className="px-4 py-2.5 rounded-xl transition-opacity"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.85rem", fontWeight: 800, border: "none", opacity: name.trim() ? 1 : 0.5, cursor: name.trim() ? "pointer" : "not-allowed" }}>
          {initial ? "บันทึก" : "เพิ่ม"}
        </button>
      </div>
    </form>
  );
}

export default function ProjectsSettingsPage() {
  const { projects, addProject, updateProject, removeProject } = useData();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mx-auto" style={{ maxWidth: 720 }}>
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--wt-text)" }}>โปรเจกต์</h2>
            <p style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>จัดการโปรเจกต์สำหรับจัดกลุ่มงาน</p>
          </div>
          {!adding && (
            <button onClick={() => { setAdding(true); setEditingId(null); }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.82rem", fontWeight: 800, border: "none", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
              <Plus size={15} /> เพิ่มโปรเจกต์
            </button>
          )}
        </div>

        <div className="space-y-2 mt-4">
          {adding && (
            <ProjectForm
              onSave={data => { addProject(data); setAdding(false); }}
              onCancel={() => setAdding(false)} />
          )}

          {projects.length === 0 && !adding && (
            <div className="text-center py-10" style={{ color: "var(--wt-muted)" }}>
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--wt-text)" }}>ยังไม่มีโปรเจกต์</p>
              <p style={{ fontSize: "0.8rem", marginTop: 2 }}>กด “เพิ่มโปรเจกต์” เพื่อเริ่ม</p>
            </div>
          )}

          {projects.map(proj => (
            editingId === proj.id ? (
              <ProjectForm key={proj.id} initial={proj}
                onSave={data => { updateProject(proj.id, data); setEditingId(null); }}
                onCancel={() => setEditingId(null)} />
            ) : (
              <div key={proj.id} className="group flex items-center gap-3 rounded-2xl p-3"
                style={{ border: "1px solid var(--wt-border)", background: "var(--wt-card)", opacity: proj.isActive ? 1 : 0.55 }}>
                <span className="inline-flex items-center justify-center rounded-xl shrink-0"
                  style={{ width: 38, height: 38, background: proj.color + "22", filter: proj.isActive ? "none" : "grayscale(1)" }}>
                  <span className="inline-block rounded-full" style={{ width: 14, height: 14, background: proj.color }} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate flex items-center gap-2" style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--wt-text)" }}>
                    {proj.name}
                    {!proj.isActive && <span className="rounded-full px-2 py-0.5 shrink-0" style={{ fontSize: "0.64rem", fontWeight: 800, background: "var(--wt-soft2)", color: "var(--wt-muted)" }}>ปิดใช้งาน</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: proj.color }} />
                    <span style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>{proj.color}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button onClick={() => updateProject(proj.id, { name: proj.name, color: proj.color, isActive: !proj.isActive })}
                    aria-label={proj.isActive ? `ปิดใช้งาน ${proj.name}` : `เปิดใช้งาน ${proj.name}`} title={proj.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    className="p-2 rounded-xl transition-colors" style={{ color: proj.isActive ? "#7c3aed" : "var(--wt-muted)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    {proj.isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                  </button>
                  <button onClick={() => { setEditingId(proj.id); setAdding(false); }} aria-label={`แก้ไข ${proj.name}`}
                    className="p-2 rounded-xl transition-colors" style={{ color: "var(--wt-muted)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => removeProject(proj.id)} aria-label={`ลบ ${proj.name}`}
                    className="p-2 rounded-xl transition-colors" style={{ color: "#f43f5e" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>

        <p className="mt-4" style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>
          <X size={11} className="inline" style={{ verticalAlign: "-1px" }} /> ลบโปรเจกต์แล้วกดเลิกทำได้ทันทีจากแถบด้านล่าง
        </p>
      </div>
    </div>
  );
}

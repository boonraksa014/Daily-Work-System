"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Kanban, BookOpen, BarChart3,
  Sun, Moon, Menu, X, Settings, ChevronDown, User, LogOut
} from "lucide-react";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ภาพรวม",       emoji: "🏠", icon: <LayoutDashboard size={17} />, gradient: "linear-gradient(135deg, #7c3aed, #a855f7)" },
  { href: "/kanban",    label: "Kanban",        emoji: "📋", icon: <Kanban size={17} />,           gradient: "linear-gradient(135deg, #0369a1, #38bdf8)" },
  { href: "/log",       label: "บันทึกรายวัน", emoji: "✍️", icon: <BookOpen size={17} />,         gradient: "linear-gradient(135deg, #059669, #34d399)" },
  { href: "/reports",   label: "รายงาน",        emoji: "📊", icon: <BarChart3 size={17} />,        gradient: "linear-gradient(135deg, #d97706, #fbbf24)" },
];

const SETTINGS_ITEMS = [
  { href: "/settings/profile",    label: "โปรไฟล์",  emoji: "👤" },
  { href: "/settings/general",    label: "ทั่วไป",   emoji: "🎛️" },
  { href: "/settings/categories", label: "หมวดหมู่", emoji: "🏷️" },
  { href: "/settings/tags",       label: "แท็ก",     emoji: "🔖" },
  { href: "/settings/data",       label: "ข้อมูล",   emoji: "💾" },
];

const ADMIN_SETTINGS_ITEM = { href: "/settings/users", label: "ผู้ใช้งาน", emoji: "👥" };

const SETTINGS_GRADIENT = "linear-gradient(135deg, #475569, #94a3b8)";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { tasks, settings } = useData();
  const { isAdmin, user, signOut } = useAuth();
  const settingsItems = isAdmin ? [...SETTINGS_ITEMS, ADMIN_SETTINGS_ITEM] : SETTINGS_ITEMS;
  const { resolvedTheme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const isDark = resolvedTheme === "dark";
  const onSettings = pathname.startsWith("/settings");
  const settingsExpanded = settingsOpen || onSettings;
  const activeSettings = settingsItems.find(s => pathname.startsWith(s.href));
  const currentNav = onSettings
    ? { label: `ตั้งค่า · ${activeSettings?.label ?? ""}`, icon: <Settings size={17} />, gradient: SETTINGS_GRADIENT }
    : (NAV_ITEMS.find(n => n.href === pathname) ?? NAV_ITEMS[0]);
  const doneTasks = tasks.filter(t => t.status === "done").length;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--wt-page)", fontFamily: "Nunito, 'Nunito Sans', system-ui, sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 lg:hidden" style={{ background: "rgba(45,31,110,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-30 h-full flex flex-col transition-transform duration-300 shrink-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 220, background: "var(--wt-card)", borderRight: "2px solid var(--wt-border)", boxShadow: "4px 0 24px rgba(124,58,237,0.08)" }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center justify-between">
            <Logo iconSize={30} />
            <button onClick={() => setSidebarOpen(false)} aria-label="ปิดเมนู" className="lg:hidden p-1.5 rounded-xl" style={{ color: "var(--wt-muted)" }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--wt-border) transparent" }}>
          {NAV_ITEMS.map(item => {
            const active = item.href === pathname;
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left"
                style={{
                  background: active ? item.gradient : "transparent",
                  boxShadow: active ? "0 4px 12px rgba(124,58,237,0.25)" : "none",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--wt-soft2)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <span className="text-xl shrink-0">{item.emoji}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: active ? 800 : 600, color: active ? "white" : "var(--wt-text)" }}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Settings group */}
          <div className="pt-1">
            <button onClick={() => setSettingsOpen(o => !o)} aria-expanded={settingsExpanded}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left"
              style={{ background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span className="text-xl shrink-0">⚙️</span>
              <span style={{ fontSize: "0.85rem", fontWeight: onSettings ? 800 : 600, color: "var(--wt-text)" }}>ตั้งค่า</span>
              <ChevronDown size={15} className="ml-auto shrink-0" style={{ color: "var(--wt-muted)", transform: settingsExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {settingsExpanded && (
              <div className="mt-1 space-y-1" style={{ paddingLeft: 14 }}>
                {settingsItems.map(s => {
                  const active = s.href === pathname;
                  return (
                    <Link key={s.href} href={s.href} onClick={() => setSidebarOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all text-left"
                      style={{ background: active ? "var(--wt-soft2)" : "transparent" }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--wt-soft2)"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                      <span className="text-base shrink-0">{s.emoji}</span>
                      <span style={{ fontSize: "0.82rem", fontWeight: active ? 800 : 600, color: active ? "#7c3aed" : "var(--wt-text)" }}>{s.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom widget */}
        <div className="px-4 pb-5 pt-3 shrink-0">
          <div className="rounded-2xl p-4 overflow-hidden relative" style={{ background: "linear-gradient(135deg, var(--wt-border), #fce7f3)" }}>
            <div className="absolute" style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(124,58,237,0.08)", top: -20, right: -20 }} />
            <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>งานทั้งหมด</p>
            <p style={{ fontSize: "2rem", fontWeight: 900, color: "var(--wt-text)", lineHeight: 1 }}>{tasks.length}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(124,58,237,0.15)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: tasks.length > 0 ? `${(doneTasks / tasks.length) * 100}%` : "0%", background: "linear-gradient(90deg, #7c3aed, #34d399)" }} />
              </div>
            </div>
            <p style={{ fontSize: "0.68rem", color: "var(--wt-muted)", fontWeight: 600, marginTop: 4 }}>
              ✅ เสร็จแล้ว {doneTasks} งาน
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white flex items-center gap-3 px-5 py-3.5 shrink-0"
          style={{ borderBottom: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.06)" }}>
          <button onClick={() => setSidebarOpen(true)} aria-label="เปิดเมนู" className="lg:hidden p-2 rounded-xl transition"
            style={{ color: "var(--wt-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: currentNav.gradient, boxShadow: "0 3px 10px rgba(124,58,237,0.25)" }}>
              <div style={{ color: "white" }}>{currentNav.icon}</div>
            </div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--wt-text)" }}>{currentNav.label}</h2>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
              className="p-2 rounded-xl transition"
              style={{ background: "var(--wt-soft2)", color: isDark ? "#fbbf24" : "#7c3aed" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--wt-soft2)" }}>
              <span style={{ fontSize: "0.82rem" }}>📅</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed" }}>
                {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(o => !o)} aria-label="เมนูบัญชี" aria-haspopup="menu" aria-expanded={menuOpen}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform"
                style={{ background: settings.avatarColor }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "white" }}>{(settings.displayName.trim()[0] ?? "?").toUpperCase()}</span>
              </button>

              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 rounded-2xl overflow-hidden"
                  style={{ width: 220, background: "var(--wt-card)", border: "2px solid var(--wt-border)", boxShadow: "0 14px 40px rgba(45,31,110,0.22)", zIndex: 40, animation: "wt-pop-in 0.14s cubic-bezier(0.22,1,0.36,1)" }}>
                  <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--wt-border)" }}>
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: settings.avatarColor }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "white" }}>{(settings.displayName.trim()[0] ?? "?").toUpperCase()}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--wt-text)" }}>{settings.displayName || "ผู้ใช้"}</p>
                      <p className="truncate" style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>{user?.email ?? ""}</p>
                    </div>
                  </div>
                  <Link href="/settings/profile" role="menuitem" onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors"
                    style={{ color: "var(--wt-text)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <User size={16} style={{ color: "var(--wt-muted)" }} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 700 }}>โปรไฟล์</span>
                  </Link>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); signOut(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors text-left"
                    style={{ color: "#e11d48" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(225,29,72,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <LogOut size={16} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 800 }}>ออกจากระบบ</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--wt-border) transparent" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

// น้องแมวเดินเล่น + มีพฤติกรรมหลากหลาย (สไตล์ VS Code Pets) ด้วยเฟรมที่มีใน public/
//   cat-1,2 = เดิน · cat-3 = นั่ง · cat-4 = เลียขน · cat-5 = นอน · cat-6 = กระโดด · cat-7 = ดีใจ
// เดินไปเรื่อยๆ แล้วสุ่มแวะทำท่าต่างๆ — ขับเคลื่อนตำแหน่งด้วย rAF ให้ลื่น
// ของตกแต่งล้วน: ไม่ขวางการคลิก + ปิดเมื่อ prefers-reduced-motion
import { useEffect, useRef, useState } from "react";

const F = {
  walk: ["/cat-1.png", "/cat-2.png"],
  sit: "/cat-3.png",
  groom: "/cat-4.png",
  sleep: "/cat-5.png",
  jump: "/cat-6.png",
  happy: "/cat-7.png",
};
const ALL = [...F.walk, F.sit, F.groom, F.sleep, F.jump, F.happy];
const HEIGHT = 64;
const BOX = 80;
const SPEED = 44; // px ต่อวินาที

type Mode = "walk" | "sit" | "groom" | "sleep" | "jump" | "happy";

export function RoamingPet() {
  const [ready, setReady] = useState(false);
  const [img, setImg] = useState(F.walk[0]);
  const [hopping, setHopping] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const x = useRef(48);
  const dir = useRef<1 | -1>(1);
  const mode = useRef<Mode>("walk");

  // preload ทุกเฟรม
  useEffect(() => {
    let n = 0, ok = true;
    ALL.forEach(src => {
      const im = new Image();
      im.onload = () => { if (++n === ALL.length && ok) setReady(true); };
      im.onerror = () => { ok = false; };
      im.src = src;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return; // เคารพ reduced-motion

    let stopped = false;
    let raf = 0;
    let last = performance.now();
    const maxX = () => Math.max(0, window.innerWidth - BOX);

    const apply = () => {
      const el = wrapRef.current;
      if (el) el.style.transform = `translateX(${x.current}px) scaleX(${dir.current})`;
    };
    apply();

    // สลับเฟรมเดิน (เฉพาะตอน walk)
    const frameTimer = setInterval(() => {
      if (mode.current === "walk") setImg(p => (p === F.walk[0] ? F.walk[1] : F.walk[0]));
    }, 200);

    // ลูปขยับตำแหน่ง
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (mode.current === "walk") {
        x.current += dir.current * SPEED * dt;
        const mx = maxX();
        if (x.current <= 0) { x.current = 0; dir.current = 1; }
        else if (x.current >= mx) { x.current = mx; dir.current = -1; }
      }
      apply();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // ตารางพฤติกรรม: เดินสักพัก → สุ่มทำท่า → เดินต่อ
    let timer: ReturnType<typeof setTimeout>;
    const startWalk = () => {
      mode.current = "walk";
      setImg(F.walk[0]);
      timer = setTimeout(startAction, 3000 + Math.random() * 3500);
    };
    const startAction = () => {
      const acts: Mode[] = ["sit", "groom", "sleep", "jump", "happy"];
      const a = acts[Math.floor(Math.random() * acts.length)];
      mode.current = a;
      setImg(F[a] as string);
      if (a === "jump") setHopping(true);
      const dur = a === "sleep" ? 5000 : a === "jump" ? 1800 : a === "happy" ? 1600 : 2600;
      timer = setTimeout(() => {
        if (stopped) return;
        setHopping(false);
        if (Math.random() < 0.4) dir.current = (dir.current * -1) as 1 | -1; // บางทีหันกลับ
        startWalk();
      }, dur);
    };
    startWalk();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearInterval(frameTimer);
      clearTimeout(timer);
    };
  }, [ready]);

  if (!ready) return null;

  return (
    <div
      ref={wrapRef}
      className="wt-roam-pet"
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        bottom: 6,
        width: BOX,
        height: HEIGHT,
        zIndex: 40,
        pointerEvents: "none",
        willChange: "transform",
      }}
    >
      <div className={hopping ? "wt-hop" : undefined} style={{ width: "100%", height: "100%", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt=""
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            height: HEIGHT,
            width: "auto",
            filter: "drop-shadow(0 3px 4px rgba(45,31,110,0.28))",
          }}
        />
      </div>
    </div>
  );
}

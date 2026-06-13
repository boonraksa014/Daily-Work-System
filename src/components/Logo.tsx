/** แบรนด์มาร์ก WorkTrack — tile ไล่สีม่วง→ชมพู + เครื่องหมายถูก (ใช้คู่กับ app/icon.svg) */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="WorkTrack">
      <defs>
        <linearGradient id="wt-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#wt-logo)" />
      <path d="M9 16.6l4.6 4.6L23 10.8" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

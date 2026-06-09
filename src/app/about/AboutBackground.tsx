"use client";

// Animated mesh-gradient "aurora" backdrop for About section bands. Pure CSS
// (GPU transform/opacity) so it works everywhere — unlike R3F, which currently
// can't mount in this Next 16 / React 19 stack (@react-three/fiber v8). Drop-in
// upgradeable to a real shader once R3F is on v9.

function shift(hex: string, amt: number): string {
  try {
    const n = parseInt(hex.replace("#", ""), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
  } catch {
    return hex;
  }
}

export default function AboutBackground({
  color,
  className = "",
  overlay = "bg-black/25",
}: {
  color: string;
  className?: string;
  overlay?: string;
}) {
  const base = shift(color, -0.7);   // deep base
  const light = shift(color, 0.4);   // highlight
  const blobs = [
    { w: "60%", h: "75%", left: "-8%", top: "-15%", bg: color, op: 0.85, anim: "aboutFloat1 19s ease-in-out infinite" },
    { w: "55%", h: "70%", right: "-10%", top: "10%", bg: color, op: 0.6, anim: "aboutFloat2 24s ease-in-out infinite" },
    { w: "50%", h: "65%", left: "28%", bottom: "-20%", bg: light, op: 0.5, anim: "aboutFloat3 28s ease-in-out infinite" },
    { w: "40%", h: "55%", right: "20%", bottom: "-10%", bg: base, op: 0.7, anim: "aboutFloat1 22s ease-in-out infinite reverse" },
  ];

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={{ backgroundColor: base }} aria-hidden>
      {blobs.map((b, i) => (
        <span
          key={i}
          className="about-blob"
          style={{
            width: b.w, height: b.h, left: b.left, right: b.right, top: b.top, bottom: b.bottom,
            background: `radial-gradient(circle at 35% 35%, ${b.bg}, transparent 70%)`,
            opacity: b.op,
            animation: b.anim,
          }}
        />
      ))}
      {overlay && <div className={`absolute inset-0 ${overlay}`} />}
    </div>
  );
}

"use client";

// Multi-tenant About page — ONE responsive, always-scrollable page (no
// full-screen locks, no desktop/mobile component swap). Driven by the domain
// owner's agentProfile. Desktop gets a parallax hero + editorial grids; mobile
// turns the card sections into swipeable carousels via responsive CSS.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useTransform, useMotionValue } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { fetchAgentPublic } from "@/app/hooks/useAgentProfile";
import nextDynamic from "next/dynamic";
import { getAboutData, Reveal } from "./aboutShared";
import AboutBackground from "./AboutBackground";
import { Phone, Mail, MapPin, Award, Star, MessageCircle, Calendar, CheckCircle2, Building2, ChevronDown } from "lucide-react";

// Raw-three.js galaxy (lazy — keeps `three` out of the main bundle, client-only).
const GalaxyBackground = nextDynamic(() => import("./GalaxyBackground"), { ssr: false });

/** Swipeable carousel on mobile, grid on desktop — same markup. */
function SwipeRow({ children, cols = "md:grid-cols-3" }: { children: React.ReactNode; cols?: string }) {
  return (
    <div
      className={`flex md:grid ${cols} gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0 pb-3 md:pb-0`}
      style={{ scrollbarWidth: "none" }}
    >
      {children}
    </div>
  );
}

export default function AboutClient() {
  const router = useRouter();
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Hero background parallax (manual — this app scrolls in <body>, which
  // framer's window-based useScroll wouldn't track).
  const heroRef = useRef<HTMLElement>(null);
  const prog = useMotionValue(0);
  useEffect(() => {
    const onScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      prog.set(Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))));
    };
    onScroll();
    document.body.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.body.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [prog]);
  const bgY = useTransform(prog, [0, 1], ["0%", "30%"]);

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    let sub = "";
    if (host.includes("chatrealty")) {
      const parts = host.split("chatrealty")[0]?.replace(/\.$/, "");
      const s = parts?.split(".").filter((x) => x && x !== "www").pop();
      if (s) sub = `?subdomain=${s}`;
    } else if (host.endsWith(".localhost")) {
      const s = host.split(".localhost")[0];
      if (s && s !== "www") sub = `?subdomain=${s}`;
    }
    fetchAgentPublic(sub).then((data: any) => setAgent(data?.profile || null)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const text = isLight ? "text-gray-900" : "text-white";
  const sub = isLight ? "text-gray-600" : "text-gray-300";
  const cardBg = isLight ? "bg-white border-gray-200" : "bg-neutral-900/60 border-neutral-800";
  const sectionAlt = isLight ? "bg-gray-50" : "bg-neutral-900/40";

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className={`animate-pulse ${sub}`}>Loading…</div></div>;
  }
  if (!agent) {
    return <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center"><h1 className={`text-2xl font-bold ${text}`}>About</h1><p className={`mt-2 ${sub}`}>This site isn&apos;t set up yet.</p></div>;
  }

  const d = getAboutData(agent, isLight);
  const onPhoto = !!d.heroBg;
  const heroShadow = onPhoto ? { textShadow: "1px 2px 16px rgba(0,0,0,0.75)" } : undefined;
  const card = "rounded-2xl border p-6 h-full";

  return (
    <div className={isLight ? "bg-white" : "bg-black"}>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden min-h-[78vh] md:min-h-[90vh] flex items-center justify-center">
        {d.heroBg ? (
          <motion.div className="absolute inset-0" style={{ y: bgY }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.heroBg} alt="" className="w-full h-[125%] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/75" />
          </motion.div>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${d.brand}, ${isLight ? "#1e3a5f" : "#0a0a0a"})` }} />
        )}
        <div className="absolute inset-0" style={{ background: `radial-gradient(85% 60% at 50% 0%, ${d.brand}26 0%, transparent 60%)` }} />

        <div className="relative z-10 px-6 py-20 text-center max-w-4xl">
          {d.headshot && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden mx-auto mb-7 shadow-2xl"
              style={{ boxShadow: `0 0 0 4px ${d.brand}, 0 24px 60px -12px ${d.brand}80` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.headshot} alt={d.name} className="w-full h-full object-cover" />
            </motion.div>
          )}
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className={`text-4xl md:text-7xl font-bold tracking-tight mb-4 ${onPhoto ? "text-white" : text}`} style={heroShadow} dangerouslySetInnerHTML={{ __html: d.headline }} />
          {d.tagline && <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.22 }} className={`text-lg md:text-2xl mb-2 ${onPhoto ? "text-white/90" : sub}`} style={heroShadow}>{d.tagline}</motion.p>}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.32 }} className={`text-sm tracking-wide ${onPhoto ? "text-white/75" : sub}`} style={heroShadow}>{[d.brokerageName, d.licenseNumber ? `DRE# ${d.licenseNumber}` : null].filter(Boolean).join("  ·  ")}</motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.42 }} className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button onClick={() => router.push("/contact")} className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-white font-semibold shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: d.brand }}><MessageCircle className="w-5 h-5" /> Message {d.firstName}</button>
            <button onClick={() => router.push("/book-appointment")} className={`flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold border-2 backdrop-blur-sm transition-transform hover:scale-105 ${onPhoto ? "border-white/50 text-white hover:bg-white/10" : (isLight ? "border-gray-300 text-gray-800 hover:bg-gray-50" : "border-neutral-700 text-white hover:bg-neutral-800")}`}><Calendar className="w-5 h-5" /> Book a Call</button>
          </motion.div>
        </div>

        <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10" animate={{ y: [0, 9, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
          <ChevronDown className={`w-7 h-7 ${onPhoto ? "text-white/70" : sub}`} />
        </motion.div>
      </section>

      {/* ── Story (rotating spiral galaxy backdrop) ───────────── */}
      {d.storyParas.length > 0 && (
        <section className="relative overflow-hidden py-20 md:py-28 bg-[#050308]">
          <GalaxyBackground />
          {/* blend into the next section at the bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050308]" />
          {/* legibility: uniform on mobile; on desktop darken the right (text) column while leaving the galaxy glowing around the portrait on the left */}
          <div className="absolute inset-0 bg-black/50 md:hidden" />
          <div className="absolute inset-0 hidden md:block bg-gradient-to-l from-black/92 from-35% via-black/55 to-transparent" />
          <div className="relative z-10 max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            {d.headshot && (
              // Plain (always-opaque) wrapper — over the galaxy, an opacity reveal would let stars bleed through the portrait.
              <div className="order-1">
                <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/5] max-w-sm mx-auto md:max-w-none md:sticky md:top-24 bg-[#0a0a12]" style={{ boxShadow: `0 30px 70px -25px ${d.brand}66, 0 0 80px -8px ${d.brand}66` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.headshot} alt={d.name} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className={`order-2 ${d.headshot ? "" : "md:col-span-2 max-w-3xl mx-auto"}`}>
              <Reveal>
                <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: d.brand }}>About</span>
                <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-6 text-white" style={{ textShadow: "0 2px 18px rgba(0,0,0,0.7)" }}>Meet {d.name}</h2>
              </Reveal>
              {d.storyParas.map((p, i) => (
                <Reveal key={i} delay={i * 0.05}><p className="mb-5 text-base md:text-lg leading-relaxed text-gray-100" style={{ textShadow: "0 1px 12px rgba(0,0,0,0.85)" }}>{p}</p></Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Why work with me (swipe on mobile) ────────────────── */}
      {d.valueProps.length > 0 && (
        <section className={`py-16 md:py-24 ${sectionAlt}`}>
          <div className="max-w-5xl mx-auto px-5 md:px-6">
            <Reveal><h2 className={`text-3xl md:text-5xl font-bold mb-3 text-center ${text}`}>Why work with {d.firstName}</h2><p className={`text-center mb-10 md:mb-12 md:hidden ${sub}`}>Swipe to explore →</p></Reveal>
            <SwipeRow>
              {d.valueProps.map((v, i) => (
                <Reveal key={i} delay={i * 0.1} className="snap-center shrink-0 w-[80vw] sm:w-[48vw] md:w-auto">
                  <motion.div whileHover={{ y: -6 }} className={`${card} ${cardBg}`}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${d.brand}22` }}><CheckCircle2 className="w-6 h-6" style={{ color: d.brand }} /></div>
                    {v.title && <h3 className={`font-bold text-lg mb-2 ${text}`}>{v.title}</h3>}
                    {v.description && <p className={`text-sm leading-relaxed ${sub}`}>{v.description}</p>}
                  </motion.div>
                </Reveal>
              ))}
            </SwipeRow>
          </div>
        </section>
      )}

      {/* ── Specializations + Credentials ─────────────────────── */}
      {(d.specializations.length > 0 || d.certifications.length > 0) && (
        <section className="py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
            {d.specializations.length > 0 && (
              <Reveal>
                <h2 className={`text-2xl font-bold mb-5 ${text}`}>Specializations</h2>
                <div className="flex flex-wrap gap-2">{d.specializations.map((s, i) => <span key={i} className={`px-3.5 py-1.5 rounded-full text-sm border ${cardBg} ${sub}`}>{s}</span>)}</div>
              </Reveal>
            )}
            {d.certifications.length > 0 && (
              <Reveal delay={0.1}>
                <h2 className={`text-2xl font-bold mb-5 ${text}`}>Credentials</h2>
                <ul className="space-y-3">{d.certifications.map((c, i) => <li key={i} className={`flex items-start gap-3 ${sub}`}><Award className="w-5 h-5 mt-0.5 shrink-0" style={{ color: d.brand }} /><span><span className={`font-medium ${text}`}>{c.name}</span>{c.issuedBy ? ` — ${c.issuedBy}` : ""}{c.year ? ` (${c.year})` : ""}</span></li>)}</ul>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* ── Service areas (photo backdrop) ────────────────────── */}
      {d.serviceAreas.length > 0 && (
        <section className="relative overflow-hidden py-20 md:py-28">
          {d.heroBg ? (
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.heroBg} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${d.brand}cc, rgba(0,0,0,0.8))` }} />
            </div>
          ) : (
            <AboutBackground color={d.brand} overlay="bg-black/45" />
          )}
          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            <Reveal><h2 className="text-3xl md:text-5xl font-bold mb-3 text-white">Local Expertise</h2><p className="mb-9 text-white/85">{d.firstName} knows these communities inside out — and helps buyers and sellers across the wider region.</p></Reveal>
            <div className="flex flex-wrap gap-3 justify-center">{d.serviceAreas.map((a, i) => <Reveal key={i} delay={i * 0.04}><span className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm text-white"><MapPin className="w-4 h-4 text-white" /> {a.name}</span></Reveal>)}</div>
          </div>
        </section>
      )}

      {/* ── Testimonials (swipe on mobile) ────────────────────── */}
      {d.testimonials.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-5 md:px-6">
            <Reveal><h2 className={`text-3xl md:text-5xl font-bold mb-10 md:mb-12 text-center ${text}`}>What clients say</h2></Reveal>
            <SwipeRow cols="md:grid-cols-2">
              {d.testimonials.slice(0, 6).map((t, i) => (
                <Reveal key={i} delay={i * 0.08} className="snap-center shrink-0 w-[82vw] sm:w-[55vw] md:w-auto">
                  <div className={`${card} ${cardBg}`}>
                    {(t.rating || 0) > 0 && <div className="flex gap-0.5 mb-3">{Array.from({ length: Math.min(5, t.rating || 0) }).map((_, j) => <Star key={j} className="w-4 h-4" style={{ color: d.brand, fill: d.brand }} />)}</div>}
                    <p className={`text-base mb-4 ${text}`}>&ldquo;{t.text}&rdquo;</p>
                    <div className={`text-sm font-medium ${sub}`}>{t.clientName}{t.propertyAddress ? ` · ${t.propertyAddress}` : ""}</div>
                  </div>
                </Reveal>
              ))}
            </SwipeRow>
          </div>
        </section>
      )}

      {/* ── Connect (animated aurora) ─────────────────────────── */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <AboutBackground color={d.brand} overlay="bg-black/35" />
        <Reveal className="relative z-10 max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-3">Let&apos;s connect</h2>
          <p className="opacity-90 mb-8 text-lg">Have a question or ready to start? {d.firstName} is here to help.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {d.phone && <a href={`tel:${String(d.phone).replace(/\D/g, "")}`} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 font-medium transition"><Phone className="w-5 h-5" /> {d.phone}</a>}
            {d.email && <a href={`mailto:${d.email}`} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 font-medium transition"><Mail className="w-5 h-5" /> Email {d.firstName}</a>}
          </div>
          {d.officeAddress && <p className="flex items-center justify-center gap-2 opacity-90 text-sm mb-6"><Building2 className="w-4 h-4" /> {d.officeAddress}</p>}
          {d.socials.length > 0 && <div className="flex gap-4 justify-center">{d.socials.map(({ href, Icon }, i) => <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"><Icon className="w-5 h-5" /></a>)}</div>}
        </Reveal>
      </section>
    </div>
  );
}

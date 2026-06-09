"use client";

// Desktop About — a cinematic scroll page: parallax hero + section-by-section
// scroll-reveal animations. Reads the shared AboutData.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useTransform, useMotionValue } from "framer-motion";
import { Phone, Mail, MapPin, Award, Star, MessageCircle, Calendar, CheckCircle2, Building2, ChevronDown } from "lucide-react";
import { Reveal, type AboutData } from "./aboutShared";

export default function AboutDesktop({ d }: { d: AboutData }) {
  const router = useRouter();

  // Parallax driven off the hero's viewport position (this app scrolls in <body>,
  // which framer's window-based useScroll wouldn't track).
  const heroRef = useRef<HTMLElement>(null);
  const heroProgress = useMotionValue(0);
  useEffect(() => {
    const onScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      heroProgress.set(Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height))));
    };
    onScroll();
    document.body.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.body.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [heroProgress]);
  const bgY = useTransform(heroProgress, [0, 1], ["0%", "40%"]);
  const contentY = useTransform(heroProgress, [0, 1], ["0%", "55%"]);
  const contentOpacity = useTransform(heroProgress, [0, 0.75], [1, 0]);

  const text = d.isLight ? "text-gray-900" : "text-white";
  const sub = d.isLight ? "text-gray-600" : "text-gray-300";
  const cardBg = d.isLight ? "bg-white border-gray-200" : "bg-neutral-900/60 border-neutral-800";
  const sectionAlt = d.isLight ? "bg-gray-50" : "bg-neutral-900/40";
  const onPhoto = !!d.heroBg;
  const hTxt = onPhoto ? "text-white" : text;
  const hSub = onPhoto ? "text-white/90" : sub;
  const hMeta = onPhoto ? "text-white/75" : sub;
  const heroShadow = onPhoto ? { textShadow: "1px 2px 14px rgba(0,0,0,0.7)" } : undefined;

  return (
    <div className={d.isLight ? "bg-white" : "bg-black"}>
      {/* ── Parallax hero ─────────────────────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden min-h-[88vh] flex items-center">
        {d.heroBg && (
          <motion.div className="absolute inset-0" style={{ y: bgY }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.heroBg} alt="" className="w-full h-[120%] object-cover scale-110" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70" />
          </motion.div>
        )}
        <div className="absolute inset-0" style={{ background: `radial-gradient(90% 70% at 50% 0%, ${d.brand}22 0%, transparent 60%)` }} />

        <motion.div className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-center w-full" style={{ y: contentY, opacity: contentOpacity }}>
          {d.headshot && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: "easeOut" }}
              className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden mx-auto mb-6 shadow-2xl"
              style={{ boxShadow: `0 0 0 4px ${d.brand}, 0 20px 50px -10px ${d.brand}66` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.headshot} alt={d.name} className="w-full h-full object-cover" />
            </motion.div>
          )}
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }} className={`text-5xl md:text-6xl font-bold mb-3 ${hTxt}`} style={heroShadow} dangerouslySetInnerHTML={{ __html: d.headline }} />
          {d.tagline && <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }} className={`text-xl md:text-2xl mb-2 ${hSub}`} style={heroShadow}>{d.tagline}</motion.p>}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.32 }} className={`text-sm ${hMeta}`} style={heroShadow}>{[d.brokerageName, d.licenseNumber ? `DRE# ${d.licenseNumber}` : null].filter(Boolean).join(" · ")}</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.42 }} className="flex flex-wrap gap-3 justify-center mt-7">
            <button onClick={() => router.push("/chap")} className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: d.brand }}><MessageCircle className="w-5 h-5" /> Chat with {d.firstName}</button>
            <button onClick={() => router.push("/book-appointment")} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium border-2 transition-transform hover:scale-105 ${d.isLight ? "border-gray-300 text-gray-800 hover:bg-gray-50" : "border-neutral-700 text-white hover:bg-neutral-800"}`}><Calendar className="w-5 h-5" /> Book a Call</button>
          </motion.div>
        </motion.div>

        <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10" animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
          <ChevronDown className={`w-7 h-7 ${hMeta}`} />
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      {d.stats.length > 0 && (
        <section className="py-12" style={{ backgroundColor: d.brand }}>
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            {d.stats.slice(0, 4).map((s, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="text-3xl md:text-5xl font-extrabold">{s.value}</div>
                <div className="text-sm opacity-90 mt-1">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Story (sticky split) ──────────────────────────────── */}
      {d.storyParas.length > 0 && (
        <section className={`py-20 ${sectionAlt}`}>
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-5 gap-10">
            {d.headshot && (
              <div className="md:col-span-2">
                <div className="md:sticky md:top-24">
                  <Reveal y={50}>
                    <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/5]" style={{ boxShadow: `0 24px 60px -20px ${d.brand}55` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.headshot} alt={d.name} className="w-full h-full object-cover" />
                    </div>
                  </Reveal>
                </div>
              </div>
            )}
            <div className={d.headshot ? "md:col-span-3" : "md:col-span-5 max-w-3xl mx-auto"}>
              <Reveal><h2 className={`text-3xl md:text-5xl font-bold mb-6 ${text}`}>Meet {d.name}</h2><div className="w-16 h-1 rounded-full mb-8" style={{ backgroundColor: d.brand }} /></Reveal>
              {d.storyParas.map((p, i) => (
                <Reveal key={i} delay={i * 0.05}><p className={`mb-6 text-base md:text-lg leading-relaxed ${sub}`}>{p}</p></Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Value propositions ────────────────────────────────── */}
      {d.valueProps.length > 0 && (
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal><h2 className={`text-3xl md:text-5xl font-bold mb-12 text-center ${text}`}>Why work with {d.firstName}</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {d.valueProps.map((v, i) => (
                <Reveal key={i} delay={i * 0.12} y={50}>
                  <motion.div whileHover={{ y: -8 }} className={`h-full rounded-2xl border p-7 ${cardBg}`}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${d.brand}22` }}><CheckCircle2 className="w-6 h-6" style={{ color: d.brand }} /></div>
                    {v.title && <h3 className={`font-bold text-lg mb-1.5 ${text}`}>{v.title}</h3>}
                    {v.description && <p className={`text-sm leading-relaxed ${sub}`}>{v.description}</p>}
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Specializations + Credentials ─────────────────────── */}
      {(d.specializations.length > 0 || d.certifications.length > 0) && (
        <section className={`py-20 ${sectionAlt}`}>
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
            {d.specializations.length > 0 && (
              <Reveal>
                <h2 className={`text-2xl font-bold mb-5 ${text}`}>Specializations</h2>
                <div className="flex flex-wrap gap-2">{d.specializations.map((s, i) => <span key={i} className={`px-3 py-1.5 rounded-full text-sm border ${cardBg} ${sub}`}>{s}</span>)}</div>
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

      {/* ── Service areas ─────────────────────────────────────── */}
      {d.serviceAreas.length > 0 && (
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <Reveal><h2 className={`text-3xl md:text-5xl font-bold mb-3 ${text}`}>Where {d.firstName} works</h2><p className={`mb-8 ${sub}`}>Serving buyers and sellers across these communities.</p></Reveal>
            <div className="flex flex-wrap gap-3 justify-center">
              {d.serviceAreas.map((a, i) => <Reveal key={i} delay={i * 0.05}><span className={`flex items-center gap-1.5 px-4 py-2 rounded-full border ${cardBg} ${text}`}><MapPin className="w-4 h-4" style={{ color: d.brand }} /> {a.name}</span></Reveal>)}
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonials ──────────────────────────────────────── */}
      {d.testimonials.length > 0 && (
        <section className={`py-20 ${sectionAlt}`}>
          <div className="max-w-5xl mx-auto px-6">
            <Reveal><h2 className={`text-3xl md:text-5xl font-bold mb-12 text-center ${text}`}>What clients say</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {d.testimonials.slice(0, 4).map((t, i) => (
                <Reveal key={i} delay={i * 0.1} y={50}>
                  <div className={`h-full rounded-2xl border p-7 ${cardBg}`}>
                    {(t.rating || 0) > 0 && <div className="flex gap-0.5 mb-3">{Array.from({ length: Math.min(5, t.rating || 0) }).map((_, j) => <Star key={j} className="w-4 h-4" style={{ color: d.brand, fill: d.brand }} />)}</div>}
                    <p className={`text-base mb-4 ${text}`}>&ldquo;{t.text}&rdquo;</p>
                    <div className={`text-sm font-medium ${sub}`}>{t.clientName}{t.propertyAddress ? ` · ${t.propertyAddress}` : ""}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Connect ───────────────────────────────────────────── */}
      <section className="py-24" style={{ background: `linear-gradient(135deg, ${d.brand}, ${d.isLight ? "#1e3a5f" : "#000000"})` }}>
        <Reveal className="max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-3">Let&apos;s connect</h2>
          <p className="opacity-90 mb-8">Have a question or ready to start? {d.firstName} is here to help.</p>
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            {d.phone && <a href={`tel:${String(d.phone).replace(/\D/g, "")}`} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 font-medium transition"><Phone className="w-5 h-5" /> {d.phone}</a>}
            {d.email && <a href={`mailto:${d.email}`} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 font-medium transition"><Mail className="w-5 h-5" /> Email</a>}
          </div>
          {d.officeAddress && <p className="flex items-center justify-center gap-2 opacity-90 text-sm mb-6"><Building2 className="w-4 h-4" /> {d.officeAddress}</p>}
          {d.socials.length > 0 && <div className="flex gap-4 justify-center">{d.socials.map(({ href, Icon }, i) => <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"><Icon className="w-5 h-5" /></a>)}</div>}
        </Reveal>
      </section>
    </div>
  );
}

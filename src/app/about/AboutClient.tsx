"use client";

// Multi-tenant About page body. Pulls everything from the domain owner's
// agentProfile (via /api/agent/public) and renders rich, theme-aware sections
// with a parallax hero + framer-motion scroll-reveal animations. Each section
// only renders if the agent has filled in that content.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useTransform, useMotionValue } from "framer-motion";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { fetchAgentPublic } from "@/app/hooks/useAgentProfile";
import { Phone, Mail, MapPin, Award, Star, MessageCircle, Calendar, CheckCircle2, Building2, Facebook, Instagram, Linkedin, Youtube, ChevronDown } from "lucide-react";

/** Fade + rise into view once, on scroll. */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export default function AboutClient() {
  const router = useRouter();
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Parallax: the hero background drifts slower than the page; the foreground
  // content lifts + fades as you scroll past it. Driven manually off the hero's
  // viewport position so it works no matter which element is the scroll
  // container (this app scrolls in <body>, so framer's window-based useScroll
  // wouldn't track it).
  const heroRef = useRef<HTMLElement>(null);
  const heroProgress = useMotionValue(0);
  useEffect(() => {
    const onScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      heroProgress.set(p);
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
    fetchAgentPublic(sub)
      .then((d: any) => setAgent(d?.profile || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const text = isLight ? "text-gray-900" : "text-white";
  const sub = isLight ? "text-gray-600" : "text-gray-300";
  const cardBg = isLight ? "bg-white border-gray-200" : "bg-neutral-900/60 border-neutral-800";
  const sectionAlt = isLight ? "bg-gray-50" : "bg-neutral-900/40";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className={`animate-pulse ${sub}`}>Loading…</div>
      </div>
    );
  }
  if (!agent) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className={`text-2xl font-bold ${text}`}>About</h1>
        <p className={`mt-2 ${sub}`}>This site isn&apos;t set up yet.</p>
      </div>
    );
  }

  const ap = agent.agentProfile || {};
  const name: string = agent.name || "Your Agent";
  const firstName = name.split(" ")[0];
  const brand = ap.brandColor || "#2563eb";
  const headshot = ap.headshot || ap.profilePhoto;
  const heroBg = isLight ? (ap.heroImage || ap.heroPhoto) : (ap.heroImageDark || ap.heroPhotoDark || ap.heroImage || ap.heroPhoto);
  const onPhoto = !!heroBg; // over a photo → white text + dark overlay for contrast
  const hTxt = onPhoto ? "text-white" : text;
  const hSub = onPhoto ? "text-white/90" : sub;
  const hMeta = onPhoto ? "text-white/75" : sub;
  const heroShadow = onPhoto ? { textShadow: "1px 2px 14px rgba(0,0,0,0.7)" } : undefined;
  const headline: string = ap.headline || `Meet ${firstName}`;
  const tagline: string = ap.tagline || "";
  const story: string = ap.personalStory || ap.bio || "";
  const storyParas = story.split(/\n+/).filter(Boolean);
  const stats = (ap.stats || []).filter((s: any) => s && (s.value || s.label));
  const valueProps = (ap.valuePropositions || []).filter((v: any) => v && (v.title || v.description));
  const specializations = (ap.specializations || []).filter(Boolean);
  const certifications = (ap.certifications || []).filter((c: any) => c && c.name);
  const serviceAreas = (ap.serviceAreas || []).filter((a: any) => a && a.name);
  const testimonials = (ap.testimonials || []).filter((t: any) => t && t.text);
  const phone = ap.cellPhone || ap.officePhone || agent.phone;
  const email = agent.email;
  const socials = [
    { href: ap.facebook, Icon: Facebook },
    { href: ap.instagram, Icon: Instagram },
    { href: ap.linkedin, Icon: Linkedin },
    { href: ap.youtube, Icon: Youtube },
  ].filter((s) => s.href);

  return (
    <div className={isLight ? "bg-white" : "bg-black"}>
      {/* ── Parallax hero header ──────────────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden min-h-[88vh] flex items-center">
        {heroBg && (
          <motion.div className="absolute inset-0" style={{ y: bgY }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroBg} alt="" className="w-full h-[120%] object-cover scale-110" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70" />
          </motion.div>
        )}
        <div className="absolute inset-0" style={{ background: `radial-gradient(90% 70% at 50% 0%, ${brand}22 0%, transparent 60%)` }} />

        <motion.div className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-center w-full" style={{ y: contentY, opacity: contentOpacity }}>
          {headshot && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden mx-auto mb-6 shadow-2xl"
              style={{ boxShadow: `0 0 0 4px ${brand}, 0 20px 50px -10px ${brand}66` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={headshot} alt={name} className="w-full h-full object-cover" />
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}
            className={`text-4xl md:text-6xl font-bold mb-3 ${hTxt}`}
            style={heroShadow}
            dangerouslySetInnerHTML={{ __html: headline }}
          />
          {tagline && (
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }} className={`text-lg md:text-2xl mb-2 ${hSub}`} style={heroShadow}>
              {tagline}
            </motion.p>
          )}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.32 }} className={`text-sm ${hMeta}`} style={heroShadow}>
            {[agent.brokerageName, agent.licenseNumber ? `DRE# ${agent.licenseNumber}` : null].filter(Boolean).join(" · ")}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.42 }} className="flex flex-wrap gap-3 justify-center mt-7">
            <button onClick={() => router.push("/chap")} className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: brand }}>
              <MessageCircle className="w-5 h-5" /> Chat with {firstName}
            </button>
            <button onClick={() => router.push("/book-appointment")} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium border-2 transition-transform hover:scale-105 ${isLight ? "border-gray-300 text-gray-800 hover:bg-gray-50" : "border-neutral-700 text-white hover:bg-neutral-800"}`}>
              <Calendar className="w-5 h-5" /> Book a Call
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ChevronDown className={`w-7 h-7 ${hMeta}`} />
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <section className="py-12" style={{ backgroundColor: brand }}>
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            {stats.slice(0, 4).map((s: any, i: number) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="text-3xl md:text-5xl font-extrabold">{s.value}</div>
                <div className="text-sm opacity-90 mt-1">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Story ─────────────────────────────────────────────── */}
      {storyParas.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          <Reveal>
            <h2 className={`text-2xl md:text-4xl font-bold mb-6 ${text}`}>Meet {name}</h2>
            <div className="w-16 h-1 rounded-full mb-8" style={{ backgroundColor: brand }} />
          </Reveal>
          {storyParas.map((p: string, i: number) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className={`mb-6 text-base md:text-lg leading-relaxed ${sub}`}>{p}</p>
            </Reveal>
          ))}
        </section>
      )}

      {/* ── Value propositions ────────────────────────────────── */}
      {valueProps.length > 0 && (
        <section className={`py-16 md:py-24 ${sectionAlt}`}>
          <div className="max-w-5xl mx-auto px-6">
            <Reveal><h2 className={`text-2xl md:text-4xl font-bold mb-12 text-center ${text}`}>Why work with {firstName}</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {valueProps.map((v: any, i: number) => (
                <Reveal key={i} delay={i * 0.12}>
                  <motion.div whileHover={{ y: -6 }} className={`h-full rounded-2xl border p-6 ${cardBg}`}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${brand}22` }}>
                      <CheckCircle2 className="w-6 h-6" style={{ color: brand }} />
                    </div>
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
      {(specializations.length > 0 || certifications.length > 0) && (
        <section className="max-w-5xl mx-auto px-6 py-16 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-10">
          {specializations.length > 0 && (
            <Reveal>
              <h2 className={`text-xl md:text-2xl font-bold mb-5 ${text}`}>Specializations</h2>
              <div className="flex flex-wrap gap-2">
                {specializations.map((s: string, i: number) => (
                  <span key={i} className={`px-3 py-1.5 rounded-full text-sm border ${cardBg} ${sub}`}>{s}</span>
                ))}
              </div>
            </Reveal>
          )}
          {certifications.length > 0 && (
            <Reveal delay={0.1}>
              <h2 className={`text-xl md:text-2xl font-bold mb-5 ${text}`}>Credentials</h2>
              <ul className="space-y-3">
                {certifications.map((c: any, i: number) => (
                  <li key={i} className={`flex items-start gap-3 ${sub}`}>
                    <Award className="w-5 h-5 mt-0.5 shrink-0" style={{ color: brand }} />
                    <span><span className={`font-medium ${text}`}>{c.name}</span>{c.issuedBy ? ` — ${c.issuedBy}` : ""}{c.year ? ` (${c.year})` : ""}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </section>
      )}

      {/* ── Service areas ─────────────────────────────────────── */}
      {serviceAreas.length > 0 && (
        <section className={`py-16 md:py-24 ${sectionAlt}`}>
          <div className="max-w-5xl mx-auto px-6 text-center">
            <Reveal>
              <h2 className={`text-2xl md:text-4xl font-bold mb-3 ${text}`}>Where {firstName} works</h2>
              <p className={`mb-8 ${sub}`}>Serving buyers and sellers across these communities.</p>
            </Reveal>
            <div className="flex flex-wrap gap-3 justify-center">
              {serviceAreas.map((a: any, i: number) => (
                <Reveal key={i} delay={i * 0.05}>
                  <span className={`flex items-center gap-1.5 px-4 py-2 rounded-full border ${cardBg} ${text}`}>
                    <MapPin className="w-4 h-4" style={{ color: brand }} /> {a.name}
                  </span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonials ──────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <Reveal><h2 className={`text-2xl md:text-4xl font-bold mb-12 text-center ${text}`}>What clients say</h2></Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.slice(0, 4).map((t: any, i: number) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className={`h-full rounded-2xl border p-6 ${cardBg}`}>
                  {t.rating > 0 && (
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: Math.min(5, t.rating) }).map((_, j) => (
                        <Star key={j} className="w-4 h-4" style={{ color: brand, fill: brand }} />
                      ))}
                    </div>
                  )}
                  <p className={`text-base mb-4 ${text}`}>&ldquo;{t.text}&rdquo;</p>
                  <div className={`text-sm font-medium ${sub}`}>{t.clientName}{t.propertyAddress ? ` · ${t.propertyAddress}` : ""}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Connect ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24" style={{ background: `linear-gradient(135deg, ${brand}, ${isLight ? "#1e3a5f" : "#000000"})` }}>
        <Reveal className="max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-2xl md:text-4xl font-bold mb-3">Let&apos;s connect</h2>
          <p className="opacity-90 mb-8">Have a question or ready to start? {firstName} is here to help.</p>
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            {phone && (
              <a href={`tel:${String(phone).replace(/\D/g, "")}`} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 font-medium transition">
                <Phone className="w-5 h-5" /> {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 font-medium transition">
                <Mail className="w-5 h-5" /> Email
              </a>
            )}
          </div>
          {ap.officeAddress && (
            <p className="flex items-center justify-center gap-2 opacity-90 text-sm mb-6"><Building2 className="w-4 h-4" /> {ap.officeAddress}</p>
          )}
          {socials.length > 0 && (
            <div className="flex gap-4 justify-center">
              {socials.map(({ href, Icon }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          )}
        </Reveal>
      </section>
    </div>
  );
}

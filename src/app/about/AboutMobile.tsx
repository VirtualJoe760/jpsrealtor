"use client";

// Mobile About — a full-screen, horizontally swipeable panel deck (like stories).
// Each section is its own snap panel; content staggers in when you land on it.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Phone, Mail, MapPin, Award, Star, MessageCircle, Calendar, CheckCircle2, ChevronRight } from "lucide-react";
import type { AboutData } from "./aboutShared";

const panelV: Variants = {
  hide: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};
const itemV: Variants = {
  hide: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function AboutMobile({ d }: { d: AboutData }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const goTo = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const txt = d.isLight ? "text-gray-900" : "text-white";
  const sub = d.isLight ? "text-gray-600" : "text-gray-300";
  const cardBg = d.isLight ? "bg-white border-gray-200" : "bg-neutral-900/70 border-neutral-800";
  const panelBg = d.isLight ? "bg-white" : "bg-neutral-950";

  // Build the panel list from available content.
  const panels: string[] = ["hero"];
  if (d.stats.length) panels.push("stats");
  if (d.storyParas.length) panels.push("story");
  if (d.valueProps.length) panels.push("value");
  if (d.serviceAreas.length) panels.push("areas");
  if (d.testimonials.length) panels.push("testimonials");
  panels.push("connect");

  const Panel = ({ children, className = "", idx }: { children: React.ReactNode; className?: string; idx: number }) => (
    <div className={`w-screen shrink-0 snap-center h-full relative overflow-hidden ${className}`}>
      <motion.div variants={panelV} initial="hide" animate={active === idx ? "show" : "hide"} className="h-full">
        {children}
      </motion.div>
    </div>
  );

  return (
    <div className="relative h-[100dvh] overflow-hidden">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {panels.map((p, idx) => {
          if (p === "hero")
            return (
              <Panel key={p} idx={idx}>
                {d.heroBg && (
                  <div className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.heroBg} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />
                  </div>
                )}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-7 pb-28">
                  {d.headshot && (
                    <motion.div variants={itemV} className="w-32 h-32 rounded-full overflow-hidden mb-6 shadow-2xl" style={{ boxShadow: `0 0 0 4px ${d.brand}, 0 18px 40px -8px ${d.brand}88` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.headshot} alt={d.name} className="w-full h-full object-cover" />
                    </motion.div>
                  )}
                  <motion.h1 variants={itemV} className="text-4xl font-bold text-white mb-2" style={{ textShadow: "1px 2px 12px rgba(0,0,0,0.7)" }} dangerouslySetInnerHTML={{ __html: d.headline }} />
                  {d.tagline && <motion.p variants={itemV} className="text-lg text-white/90 mb-1" style={{ textShadow: "1px 1px 8px rgba(0,0,0,0.7)" }}>{d.tagline}</motion.p>}
                  <motion.p variants={itemV} className="text-xs text-white/75 mb-7">{[d.brokerageName, d.licenseNumber ? `DRE# ${d.licenseNumber}` : null].filter(Boolean).join(" · ")}</motion.p>
                  <motion.div variants={itemV} className="flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={() => router.push("/chap")} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold shadow-lg" style={{ backgroundColor: d.brand }}>
                      <MessageCircle className="w-5 h-5" /> Chat with {d.firstName}
                    </button>
                    <button onClick={() => router.push("/book-appointment")} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border-2 border-white/40 text-white">
                      <Calendar className="w-5 h-5" /> Book a Call
                    </button>
                  </motion.div>
                </div>
                {/* Swipe hint */}
                <motion.div className="absolute bottom-24 right-6 z-10 flex items-center gap-1 text-white/80 text-sm" animate={{ x: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
                  swipe <ChevronRight className="w-5 h-5" />
                </motion.div>
              </Panel>
            );

          if (p === "stats")
            return (
              <Panel key={p} idx={idx} className="flex items-center justify-center" >
                <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${d.brand}, ${d.isLight ? "#1e3a5f" : "#0a0a0a"})` }} />
                <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 pb-28 text-center text-white gap-10">
                  {d.stats.slice(0, 4).map((s, i) => (
                    <motion.div key={i} variants={itemV}>
                      <div className="text-6xl font-extrabold leading-none">{s.value}</div>
                      <div className="text-base opacity-90 mt-2">{s.label}</div>
                    </motion.div>
                  ))}
                </div>
              </Panel>
            );

          if (p === "story")
            return (
              <Panel key={p} idx={idx} className={panelBg}>
                <div className="relative z-10 h-full flex flex-col justify-center px-7 pt-12 pb-28">
                  <motion.h2 variants={itemV} className={`text-3xl font-bold mb-3 ${txt}`}>Meet {d.name}</motion.h2>
                  <motion.div variants={itemV} className="w-14 h-1 rounded-full mb-6" style={{ backgroundColor: d.brand }} />
                  <motion.div variants={itemV} className="overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
                    {d.storyParas.map((para, i) => (
                      <p key={i} className={`mb-4 text-base leading-relaxed ${sub}`}>{para}</p>
                    ))}
                  </motion.div>
                </div>
              </Panel>
            );

          if (p === "value")
            return (
              <Panel key={p} idx={idx} className={panelBg}>
                <div className="relative z-10 h-full flex flex-col justify-center px-7 pt-12 pb-28">
                  <motion.h2 variants={itemV} className={`text-3xl font-bold mb-6 ${txt}`}>Why work with {d.firstName}</motion.h2>
                  <div className="overflow-y-auto space-y-4 pr-1" style={{ maxHeight: "66vh" }}>
                    {d.valueProps.map((v, i) => (
                      <motion.div key={i} variants={itemV} className={`rounded-2xl border p-5 ${cardBg}`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${d.brand}22` }}>
                          <CheckCircle2 className="w-5 h-5" style={{ color: d.brand }} />
                        </div>
                        {v.title && <h3 className={`font-bold mb-1 ${txt}`}>{v.title}</h3>}
                        {v.description && <p className={`text-sm leading-relaxed ${sub}`}>{v.description}</p>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Panel>
            );

          if (p === "areas")
            return (
              <Panel key={p} idx={idx} className={panelBg}>
                <div className="relative z-10 h-full flex flex-col justify-center px-7 pb-28 text-center">
                  <motion.h2 variants={itemV} className={`text-3xl font-bold mb-2 ${txt}`}>Where {d.firstName} works</motion.h2>
                  <motion.p variants={itemV} className={`mb-7 ${sub}`}>Serving buyers and sellers across these communities.</motion.p>
                  <motion.div variants={itemV} className="flex flex-wrap gap-2.5 justify-center">
                    {d.serviceAreas.map((a, i) => (
                      <span key={i} className={`flex items-center gap-1.5 px-4 py-2 rounded-full border ${cardBg} ${txt}`}>
                        <MapPin className="w-4 h-4" style={{ color: d.brand }} /> {a.name}
                      </span>
                    ))}
                  </motion.div>
                </div>
              </Panel>
            );

          if (p === "testimonials")
            return (
              <Panel key={p} idx={idx} className={panelBg}>
                <div className="relative z-10 h-full flex flex-col justify-center px-7 pt-12 pb-28">
                  <motion.h2 variants={itemV} className={`text-3xl font-bold mb-6 ${txt}`}>What clients say</motion.h2>
                  <div className="overflow-y-auto space-y-4 pr-1" style={{ maxHeight: "66vh" }}>
                    {d.testimonials.slice(0, 4).map((t, i) => (
                      <motion.div key={i} variants={itemV} className={`rounded-2xl border p-5 ${cardBg}`}>
                        {(t.rating || 0) > 0 && (
                          <div className="flex gap-0.5 mb-2">
                            {Array.from({ length: Math.min(5, t.rating || 0) }).map((_, j) => (
                              <Star key={j} className="w-4 h-4" style={{ color: d.brand, fill: d.brand }} />
                            ))}
                          </div>
                        )}
                        <p className={`text-sm mb-3 ${txt}`}>&ldquo;{t.text}&rdquo;</p>
                        <div className={`text-xs font-medium ${sub}`}>{t.clientName}{t.propertyAddress ? ` · ${t.propertyAddress}` : ""}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Panel>
            );

          // connect
          return (
            <Panel key={p} idx={idx} className="flex items-center justify-center">
              <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${d.brand}, ${d.isLight ? "#1e3a5f" : "#000000"})` }} />
              <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 pb-28 text-center text-white">
                <motion.h2 variants={itemV} className="text-3xl font-bold mb-3">Let&apos;s connect</motion.h2>
                <motion.p variants={itemV} className="opacity-90 mb-8">Ready to start? {d.firstName} is here to help.</motion.p>
                <motion.div variants={itemV} className="flex flex-col gap-3 w-full max-w-xs">
                  {d.phone && <a href={`tel:${String(d.phone).replace(/\D/g, "")}`} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/15 border border-white/30 font-medium"><Phone className="w-5 h-5" /> {d.phone}</a>}
                  {d.email && <a href={`mailto:${d.email}`} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/15 border border-white/30 font-medium"><Mail className="w-5 h-5" /> Email {d.firstName}</a>}
                </motion.div>
                {d.officeAddress && <motion.p variants={itemV} className="opacity-90 text-sm mt-6 flex items-center gap-2"><Award className="w-4 h-4" /> {d.officeAddress}</motion.p>}
                {d.socials.length > 0 && (
                  <motion.div variants={itemV} className="flex gap-4 justify-center mt-8">
                    {d.socials.map(({ href, Icon }, i) => (
                      <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center"><Icon className="w-5 h-5" /></a>
                    ))}
                  </motion.div>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-[84px] left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {panels.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Panel ${i + 1}`}
            className={`h-2 rounded-full transition-all ${i === active ? "w-7" : "w-2"}`}
            style={{ backgroundColor: i === active ? d.brand : (d.isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)") }}
          />
        ))}
      </div>
    </div>
  );
}

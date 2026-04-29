"use client";

import { useEffect, useState } from "react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  Sparkles,
  BarChart3,
  MessageSquareQuote,
  Search,
  ImageIcon,
  Star,
} from "lucide-react";
import { toast } from "react-toastify";

/* ---------- Types ---------- */
interface HeroConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
  backgroundImage: string;
  backgroundImageDark: string;
}

interface ValueProp {
  icon: string;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  photo: string;
  rating: number;
}

interface CustomStat {
  label: string;
  value: string;
}

interface SeoConfig {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
}

interface HomepageConfig {
  hero: HeroConfig;
  valueProps: ValueProp[];
  testimonials: Testimonial[];
  customStats: CustomStat[];
  seo: SeoConfig;
}

const EMPTY_CONFIG: HomepageConfig = {
  hero: {
    headline: "",
    subheadline: "",
    ctaText: "Get Started",
    ctaLink: "/auth/signin",
    backgroundImage: "",
    backgroundImageDark: "",
  },
  valueProps: [],
  testimonials: [],
  customStats: [],
  seo: { metaTitle: "", metaDescription: "", ogImage: "" },
};

/* ---------- Component ---------- */
export default function HomepageBuilderPage() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary, border, cardBg, buttonPrimary } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [config, setConfig] = useState<HomepageConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hero: true,
    valueProps: false,
    testimonials: false,
    customStats: false,
    seo: false,
  });

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
    isLight
      ? "bg-white border-slate-300 text-slate-900 focus:border-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:border-blue-500"
  }`;

  const labelClass = `block text-sm font-medium mb-1 ${textSecondary}`;

  useEffect(() => {
    fetch("/api/admin/homepage")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load config");
        return res.json();
      })
      .then((data) => {
        setConfig({
          hero: data.hero || EMPTY_CONFIG.hero,
          valueProps: data.valueProps || [],
          testimonials: data.testimonials || [],
          customStats: data.customStats || [],
          seo: data.seo || EMPTY_CONFIG.seo,
        });
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Homepage config saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* --- Hero helpers --- */
  const updateHero = (field: keyof HeroConfig, value: string) =>
    setConfig((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));

  /* --- ValueProps helpers --- */
  const addValueProp = () =>
    setConfig((prev) => ({
      ...prev,
      valueProps: [...prev.valueProps, { icon: "Star", title: "", description: "" }],
    }));
  const updateValueProp = (i: number, field: keyof ValueProp, value: string) =>
    setConfig((prev) => {
      const arr = [...prev.valueProps];
      arr[i] = { ...arr[i], [field]: value };
      return { ...prev, valueProps: arr };
    });
  const removeValueProp = (i: number) =>
    setConfig((prev) => ({
      ...prev,
      valueProps: prev.valueProps.filter((_, idx) => idx !== i),
    }));

  /* --- Testimonial helpers --- */
  const addTestimonial = () =>
    setConfig((prev) => ({
      ...prev,
      testimonials: [...prev.testimonials, { name: "", role: "", quote: "", photo: "", rating: 5 }],
    }));
  const updateTestimonial = (i: number, field: keyof Testimonial, value: string | number) =>
    setConfig((prev) => {
      const arr = [...prev.testimonials];
      arr[i] = { ...arr[i], [field]: value };
      return { ...prev, testimonials: arr };
    });
  const removeTestimonial = (i: number) =>
    setConfig((prev) => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, idx) => idx !== i),
    }));

  /* --- CustomStats helpers --- */
  const addStat = () =>
    setConfig((prev) => ({
      ...prev,
      customStats: [...prev.customStats, { label: "", value: "" }],
    }));
  const updateStat = (i: number, field: keyof CustomStat, value: string) =>
    setConfig((prev) => {
      const arr = [...prev.customStats];
      arr[i] = { ...arr[i], [field]: value };
      return { ...prev, customStats: arr };
    });
  const removeStat = (i: number) =>
    setConfig((prev) => ({
      ...prev,
      customStats: prev.customStats.filter((_, idx) => idx !== i),
    }));

  /* --- SEO helpers --- */
  const updateSeo = (field: keyof SeoConfig, value: string) =>
    setConfig((prev) => ({ ...prev, seo: { ...prev.seo, [field]: value } }));

  /* ---------- Collapsible Section Wrapper ---------- */
  const Section = ({
    id,
    title,
    icon: Icon,
    children,
  }: {
    id: string;
    title: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    children: React.ReactNode;
  }) => {
    const open = openSections[id];
    return (
      <div className={`${cardBg} border ${border} rounded-xl overflow-hidden`}>
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className={`w-full flex items-center justify-between px-5 py-4 text-left ${
            isLight ? "hover:bg-gray-50" : "hover:bg-white/5"
          } transition-colors`}
        >
          <div className="flex items-center gap-3">
            <Icon size={20} className="text-blue-500" />
            <span className={`text-base font-semibold ${textPrimary}`}>{title}</span>
          </div>
          {open ? (
            <ChevronUp size={18} className={textSecondary} />
          ) : (
            <ChevronDown size={18} className={textSecondary} />
          )}
        </button>
        {open && <div className={`px-5 pb-5 border-t ${border}`}>{children}</div>}
      </div>
    );
  };

  /* ---------- Render ---------- */
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <div className="animate-pulse">Loading homepage config...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${textPrimary}`}>Homepage Builder</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`${buttonPrimary} px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50`}
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Hero Section */}
      <Section id="hero" title="Hero Section" icon={Sparkles}>
        <div className="grid gap-4 pt-4">
          <div>
            <label className={labelClass}>Headline</label>
            <input
              className={inputClass}
              value={config.hero.headline}
              onChange={(e) => updateHero("headline", e.target.value)}
              placeholder="Find Your Perfect Home with AI-Powered Search"
            />
          </div>
          <div>
            <label className={labelClass}>Subheadline</label>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={config.hero.subheadline}
              onChange={(e) => updateHero("subheadline", e.target.value)}
              placeholder="ChatRealty connects you with top local agents and smart property insights."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>CTA Text</label>
              <input
                className={inputClass}
                value={config.hero.ctaText}
                onChange={(e) => updateHero("ctaText", e.target.value)}
                placeholder="Get Started"
              />
            </div>
            <div>
              <label className={labelClass}>CTA Link</label>
              <input
                className={inputClass}
                value={config.hero.ctaLink}
                onChange={(e) => updateHero("ctaLink", e.target.value)}
                placeholder="/auth/signin"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Background Image URL</label>
              <input
                className={inputClass}
                value={config.hero.backgroundImage}
                onChange={(e) => updateHero("backgroundImage", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className={labelClass}>Background Image (Dark)</label>
              <input
                className={inputClass}
                value={config.hero.backgroundImageDark}
                onChange={(e) => updateHero("backgroundImageDark", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Value Propositions */}
      <Section id="valueProps" title="Value Propositions" icon={Star}>
        <div className="space-y-4 pt-4">
          {config.valueProps.map((vp, i) => (
            <div
              key={i}
              className={`border ${border} rounded-lg p-4 ${isLight ? "bg-gray-50" : "bg-gray-800/40"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${textSecondary}`}>Card {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeValueProp(i)}
                  className="text-red-500 hover:text-red-400 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Icon (Lucide name)</label>
                    <input
                      className={inputClass}
                      value={vp.icon}
                      onChange={(e) => updateValueProp(i, "icon", e.target.value)}
                      placeholder="Star"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Title</label>
                    <input
                      className={inputClass}
                      value={vp.title}
                      onChange={(e) => updateValueProp(i, "title", e.target.value)}
                      placeholder="AI-Powered Search"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    className={`${inputClass} min-h-[50px]`}
                    value={vp.description}
                    onChange={(e) => updateValueProp(i, "description", e.target.value)}
                    placeholder="Describe this value proposition..."
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addValueProp}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              isLight
                ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                : "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
            }`}
          >
            <Plus size={16} /> Add Value Proposition
          </button>
        </div>
      </Section>

      {/* Testimonials */}
      <Section id="testimonials" title="Testimonials" icon={MessageSquareQuote}>
        <div className="space-y-4 pt-4">
          {config.testimonials.map((t, i) => (
            <div
              key={i}
              className={`border ${border} rounded-lg p-4 ${isLight ? "bg-gray-50" : "bg-gray-800/40"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${textSecondary}`}>Testimonial {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeTestimonial(i)}
                  className="text-red-500 hover:text-red-400 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input
                      className={inputClass}
                      value={t.name}
                      onChange={(e) => updateTestimonial(i, "name", e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Role</label>
                    <input
                      className={inputClass}
                      value={t.role}
                      onChange={(e) => updateTestimonial(i, "role", e.target.value)}
                      placeholder="Homebuyer"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Rating (1-5)</label>
                    <select
                      className={inputClass}
                      value={t.rating}
                      onChange={(e) => updateTestimonial(i, "rating", Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} star{n !== 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Quote</label>
                  <textarea
                    className={`${inputClass} min-h-[60px]`}
                    value={t.quote}
                    onChange={(e) => updateTestimonial(i, "quote", e.target.value)}
                    placeholder="Their experience using the platform..."
                  />
                </div>
                <div>
                  <label className={labelClass}>Photo URL (optional)</label>
                  <input
                    className={inputClass}
                    value={t.photo}
                    onChange={(e) => updateTestimonial(i, "photo", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addTestimonial}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              isLight
                ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                : "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
            }`}
          >
            <Plus size={16} /> Add Testimonial
          </button>
        </div>
      </Section>

      {/* Custom Stats */}
      <Section id="customStats" title="Custom Stats" icon={BarChart3}>
        <div className="space-y-4 pt-4">
          {config.customStats.map((s, i) => (
            <div
              key={i}
              className={`flex items-end gap-3 border ${border} rounded-lg p-4 ${
                isLight ? "bg-gray-50" : "bg-gray-800/40"
              }`}
            >
              <div className="flex-1">
                <label className={labelClass}>Label</label>
                <input
                  className={inputClass}
                  value={s.label}
                  onChange={(e) => updateStat(i, "label", e.target.value)}
                  placeholder="Active Listings"
                />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Value</label>
                <input
                  className={inputClass}
                  value={s.value}
                  onChange={(e) => updateStat(i, "value", e.target.value)}
                  placeholder="75,000+"
                />
              </div>
              <button
                type="button"
                onClick={() => removeStat(i)}
                className="text-red-500 hover:text-red-400 p-2 mb-0.5"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addStat}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              isLight
                ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                : "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
            }`}
          >
            <Plus size={16} /> Add Stat
          </button>
        </div>
      </Section>

      {/* SEO */}
      <Section id="seo" title="SEO Settings" icon={Search}>
        <div className="grid gap-4 pt-4">
          <div>
            <label className={labelClass}>Meta Title</label>
            <input
              className={inputClass}
              value={config.seo.metaTitle}
              onChange={(e) => updateSeo("metaTitle", e.target.value)}
              placeholder="ChatRealty — AI-Powered Real Estate"
            />
          </div>
          <div>
            <label className={labelClass}>Meta Description</label>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={config.seo.metaDescription}
              onChange={(e) => updateSeo("metaDescription", e.target.value)}
              placeholder="Find your perfect home with AI-powered search..."
            />
          </div>
          <div>
            <label className={labelClass}>OG Image URL</label>
            <input
              className={inputClass}
              value={config.seo.ogImage}
              onChange={(e) => updateSeo("ogImage", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </Section>

      {/* Bottom save */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`${buttonPrimary} px-6 py-3 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50`}
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save All Changes"}
        </button>
      </div>
    </div>
  );
}

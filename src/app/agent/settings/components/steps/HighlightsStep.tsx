"use client";

import { Save, Loader2, Plus, X, Star } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

interface ValueProp {
  title: string;
  description: string;
}
interface Testimonial {
  clientName: string;
  text: string;
  rating?: number;
  propertyAddress?: string;
}

export default function HighlightsStep({ formData, updateField, isLight, onSave, isSaving }: StepProps) {
  const ap = formData.agentProfile || {};
  const valueProps: ValueProp[] = ap.valuePropositions || [];
  const testimonials: Testimonial[] = ap.testimonials || [];

  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500" : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;
  const labelClass = `block text-sm font-medium mb-1.5 ${isLight ? "text-gray-700" : "text-gray-300"}`;
  const cardClass = `rounded-lg border p-4 ${isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800/50 border-gray-700"}`;
  const addBtn = `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 border-dashed transition-colors ${
    isLight ? "border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600" : "border-gray-700 text-gray-400 hover:border-emerald-600 hover:text-emerald-400"
  }`;

  // ---- Value propositions ----
  const setVP = (next: ValueProp[]) => updateField("agentProfile.valuePropositions", next);
  const addVP = () => setVP([...valueProps, { title: "", description: "" }]);
  const updateVP = (i: number, key: keyof ValueProp, val: string) => setVP(valueProps.map((v, idx) => (idx === i ? { ...v, [key]: val } : v)));
  const removeVP = (i: number) => setVP(valueProps.filter((_, idx) => idx !== i));

  // ---- Testimonials ----
  const setT = (next: Testimonial[]) => updateField("agentProfile.testimonials", next);
  const addT = () => setT([...testimonials, { clientName: "", text: "", rating: 5, propertyAddress: "" }]);
  const updateT = (i: number, key: keyof Testimonial, val: string | number) => setT(testimonials.map((t, idx) => (idx === i ? { ...t, [key]: val } : t)));
  const removeT = (i: number) => setT(testimonials.filter((_, idx) => idx !== i));

  const handleSave = () => {
    onSave({
      agentProfile: {
        // keep only filled-in entries
        valuePropositions: valueProps.filter((v) => v.title?.trim() || v.description?.trim()),
        testimonials: testimonials.filter((t) => t.text?.trim() || t.clientName?.trim()),
      },
    });
  };

  return (
    <div className={`rounded-xl border p-6 ${isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-800"}`}>
      <h2 className={`text-xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Highlights &amp; Social Proof</h2>
      <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        The &quot;Why work with me&quot; cards and client testimonials shown on your About page. Add as many as you like — sections only appear once you fill them in.
      </p>

      {/* ============ Value Propositions ============ */}
      <div className="mb-8">
        <h3 className={`text-base font-semibold mb-1 ${isLight ? "text-gray-800" : "text-gray-200"}`}>Why Work With Me</h3>
        <p className={`text-xs mb-4 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
          Client-focused reasons to choose you — benefits, not biography. Keep each title short and punchy.
        </p>

        <div className="space-y-4">
          {valueProps.map((v, i) => (
            <div key={i} className={cardClass}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wide ${isLight ? "text-gray-400" : "text-gray-500"}`}>Card {i + 1}</span>
                <button type="button" onClick={() => removeVP(i)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Title</label>
                  <input type="text" value={v.title || ""} onChange={(e) => updateVP(i, "title", e.target.value)} placeholder="e.g. Local Roots, Broader Reach" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea rows={2} value={v.description || ""} onChange={(e) => updateVP(i, "description", e.target.value)} placeholder="One or two sentences on the benefit to the client." className={inputClass} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addVP} className={`mt-4 ${addBtn}`}>
          <Plus className="w-4 h-4" /> Add a card
        </button>
      </div>

      {/* ============ Testimonials ============ */}
      <div>
        <h3 className={`text-base font-semibold mb-1 ${isLight ? "text-gray-800" : "text-gray-200"}`}>Client Testimonials</h3>
        <p className={`text-xs mb-4 ${isLight ? "text-gray-400" : "text-gray-500"}`}>Real quotes from past clients. Up to 6 show on the About page.</p>

        <div className="space-y-4">
          {testimonials.map((t, i) => (
            <div key={i} className={cardClass}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wide ${isLight ? "text-gray-400" : "text-gray-500"}`}>Review {i + 1}</span>
                <button type="button" onClick={() => removeT(i)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Quote</label>
                  <textarea rows={3} value={t.text || ""} onChange={(e) => updateT(i, "text", e.target.value)} placeholder="What the client said about working with you." className={inputClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Client name</label>
                    <input type="text" value={t.clientName || ""} onChange={(e) => updateT(i, "clientName", e.target.value)} placeholder="e.g. The Martinez Family" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Property / location <span className="font-normal opacity-60">(optional)</span></label>
                    <input type="text" value={t.propertyAddress || ""} onChange={(e) => updateT(i, "propertyAddress", e.target.value)} placeholder="e.g. La Quinta" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => updateT(i, "rating", n)} aria-label={`${n} star`}>
                        <Star className={`w-6 h-6 transition-colors ${n <= (t.rating || 0) ? "text-yellow-400 fill-yellow-400" : isLight ? "text-gray-300" : "text-gray-600"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addT} className={`mt-4 ${addBtn}`}>
          <Plus className="w-4 h-4" /> Add a testimonial
        </button>
      </div>

      {/* Save */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save &amp; Continue
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Compass, Info, Loader2 } from "lucide-react";
import TopBar from "../../components/TopBar";
import BillingTemplatePicker from "../../components/BillingTemplatePicker";
import { useToast } from "../../components/ToastProvider";
import { useTour } from "../../components/tour/TourProvider";
import { api, readStoredUser, storeUser, StoredUser } from "../../lib/api";
import { TemplateId, TEMPLATES, templateName } from "../../lib/billing";

type Tab = "personal" | "business" | "billing" | "security";
const TABS: { id: Tab; label: string }[] = [
  { id: "personal", label: "Personal info" },
  { id: "business", label: "Business details" },
  { id: "billing", label: "Billing template" },
  { id: "security", label: "Security" },
];

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const LOGO_MAX_BYTES = 1024 * 1024;

const field = "w-full h-11 bg-white border border-slate-300 rounded-xl px-3 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15";
const primaryBtn = "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold disabled:opacity-60";
const isTemplate = (v?: string): v is TemplateId => TEMPLATES.some((t) => t.id === v);

export default function ProfilePage() {
  const toast = useToast();
  const tour = useTour();
  const [tab, setTab] = useState<Tab>("billing");
  const [user, setUser] = useState<StoredUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Editable copies of the profile
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [logo, setLogo] = useState("");
  const [terms, setTerms] = useState("");
  const [billingTerms, setBillingTerms] = useState("");
  const [signature, setSignature] = useState("");
  const [stamp, setStamp] = useState("");
  const [template, setTemplate] = useState<TemplateId>("modern");
  const [password, setPassword] = useState("");

  const hydrate = (u: StoredUser) => {
    setUser(u);
    setName(u.name || "");
    setPhone(u.phone || "");
    setLogo(u.company_logo || "");
    setTerms(u.general_terms || "");
    setBillingTerms(u.billing_terms || "");
    setSignature(u.signature || "");
    setStamp(u.stamp || "");
    setTemplate(isTemplate(u.billing_template) ? u.billing_template : "modern");
  };

  useEffect(() => {
    const cached = readStoredUser();
    if (cached) hydrate(cached);
    const hash = window.location.hash.replace("#", "") as Tab;
    if (TABS.some((t) => t.id === hash)) setTab(hash);
    api<StoredUser>("/auth/me").then((me) => { storeUser(me); hydrate(me); }).catch(() => {});
  }, []);

  const selectTab = (id: Tab) => {
    setTab(id);
    setError("");
    history.replaceState(null, "", `#${id}`);
  };

  /** Send only the fields of the active tab so one tab can never overwrite another's unsaved edits. */
  const save = async (payload: Record<string, unknown>, done: string) => {
    setSaving(true);
    setError("");
    try {
      const updated = await api<StoredUser>("/auth/profile", { method: "PUT", body: JSON.stringify(payload) });
      storeUser(updated);
      hydrate(updated);
      setPassword("");
      toast.show(done, "success");
    } catch (e: any) {
      setError(e.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const onImage = (set: (v: string) => void, label: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return setError(`Use a PNG, JPG, WebP or GIF ${label}.`);
    if (file.size > LOGO_MAX_BYTES) return setError(`The ${label} must be smaller than 1 MB.`);
    setError("");
    const reader = new FileReader();
    reader.onload = () => set(String(reader.result));
    reader.readAsDataURL(file);
  };

  const dirtyTemplate = isTemplate(user?.billing_template) ? user?.billing_template !== template : template !== "modern";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <TopBar />
      <main className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Profile</h1>
            <p className="text-slate-500 mt-1 text-sm">Manage your account, business details and the template used for your bills.</p>
          </div>
          {(
            <button
              type="button"
              onClick={tour.start}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Compass className="w-4 h-4 text-amber-700" /> Tour guide
            </button>
          )}
        </div>

        <div role="tablist" aria-label="Profile sections" className="mt-6 flex gap-6 border-b border-slate-200 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => selectTab(t.id)}
              className={`py-3 text-sm whitespace-nowrap -mb-px border-b-2 ${
                tab === t.id ? "border-amber-600 text-amber-700 font-bold" : "border-transparent text-slate-500 font-semibold hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {tab === "personal" && (
          <form className="mt-6 max-w-xl space-y-4" onSubmit={(e) => { e.preventDefault(); save({ name: name.trim(), phone: phone.trim() || null }, "Profile saved"); }}>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Name</span>
              <input className={`${field} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" /></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Email</span>
              <input className={`${field} mt-1.5 bg-slate-50 text-slate-500`} value={user?.email || ""} readOnly aria-readonly="true" /></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Phone</span>
              <input className={`${field} mt-1.5`} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} inputMode="tel" autoComplete="tel" /></label>
            <button className={primaryBtn} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save changes</button>
          </form>
        )}

        {tab === "business" && (
          <form className="mt-6 max-w-xl space-y-5" onSubmit={(e) => { e.preventDefault(); save({ company_logo: logo || null, general_terms: terms.trim() || null, billing_terms: billingTerms.trim(), signature, stamp }, "Business details saved"); }}>
            <div>
              <span className="text-sm font-semibold text-slate-700">Company logo</span>
              <div className="mt-1.5 flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                  {logo ? <img src={logo} alt="Company logo" className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-slate-400">No logo</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                    Upload<input type="file" accept={LOGO_TYPES.join(",")} className="sr-only" onChange={onImage(setLogo, "logo")} />
                  </label>
                  {logo && <button type="button" onClick={() => setLogo("")} className="text-xs font-semibold text-rose-600 text-left">Remove</button>}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">Shown on estimates and bills. PNG, JPG, WebP or GIF under 1 MB.</p>
            </div>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Estimate terms and conditions</span>
              <textarea className={`${field} mt-1.5 h-40 py-2.5 resize-y`} value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={20000} /></label>
            <label className="block"><span className="text-sm font-semibold text-slate-700">Billing terms and conditions</span>
              <textarea className={`${field} mt-1.5 h-40 py-2.5 resize-y`} value={billingTerms} onChange={(e) => setBillingTerms(e.target.value)} maxLength={20000} placeholder="Payment due dates, late fees, refund policy…" />
              <span className="mt-1 block text-xs text-slate-500">Printed at the bottom of every bill.</span></label>
            {([
              { label: "Signature", value: signature, set: setSignature, key: "signature" },
              { label: "Stamp", value: stamp, set: setStamp, key: "stamp" },
            ] as const).map((f) => (
              <div key={f.key}>
                <span className="text-sm font-semibold text-slate-700">{f.label}</span>
                <div className="mt-1.5 flex items-center gap-4">
                  <div className="w-32 h-20 rounded-xl border border-slate-200 [background:#fff] flex items-center justify-center overflow-hidden">
                    {f.value ? <img src={f.value} alt={f.label} className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-slate-400">No {f.label.toLowerCase()}</span>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                      Upload<input type="file" accept={LOGO_TYPES.join(",")} className="sr-only" onChange={onImage(f.set, f.label.toLowerCase())} />
                    </label>
                    {f.value && <button type="button" onClick={() => f.set("")} className="text-xs font-semibold text-rose-600 text-left">Remove</button>}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Printed at the bottom of bills. A PNG with a transparent background looks best.</p>
              </div>
            ))}
            <button className={primaryBtn} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save changes</button>
          </form>
        )}

        {tab === "billing" && (
          <section className="mt-6">
            <h2 className="text-lg font-extrabold text-slate-900">Billing template</h2>
            <p className="text-sm text-slate-500 mt-1 mb-5">Pick the layout used for all your bills, new and already generated. You can only change it here, from your profile.</p>
            <BillingTemplatePicker value={template} onChange={setTemplate} />
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900">
              <Info className="w-[18px] h-[18px] shrink-0 mt-0.5" />
              <span>
                {dirtyTemplate
                  ? `You picked ${templateName(template)}. Save to apply it to all your bills, including ones already generated.`
                  : `New bills use the ${templateName(template)} template. Bills already generated switch to it too.`}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className={primaryBtn} disabled={saving || !dirtyTemplate} onClick={() => save({ billing_template: template }, `${templateName(template)} template saved`)}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save template
              </button>
              <button className="h-11 px-5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!dirtyTemplate} onClick={() => user && hydrate(user)}>Cancel</button>
            </div>
          </section>
        )}

        {tab === "security" && (
          <form className="mt-6 max-w-xl space-y-4" onSubmit={(e) => { e.preventDefault(); save({ new_password: password }, "Password changed. Sign in again with the new one."); }}>
            <label className="block"><span className="text-sm font-semibold text-slate-700">New password</span>
              <input type="password" className={`${field} mt-1.5`} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} maxLength={72} required autoComplete="new-password" /></label>
            <p className="text-xs text-slate-500">At least 6 characters. Changing it signs you out on every other device.</p>
            <button className={primaryBtn} disabled={saving || password.length < 6}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}Change password</button>
          </form>
        )}
      </main>
    </div>
  );
}

import React, { useState } from "react";
import { CitizenProfile, VaultDocument } from "../types";
import { User, MapPin, Accessibility, Languages, Eye, Volume2, ShieldCheck, LogOut, Award, Check } from "lucide-react";
import { motion } from "motion/react";
import { t } from "../translations";

interface ProfileViewProps {
  profile: CitizenProfile;
  documents: VaultDocument[];
  onUpdateProfile: (profile: CitizenProfile) => void;
  onLogout: () => void;
  onToggleHighContrast: () => void;
  highContrast: boolean;
  onToggleLargeText: () => void;
  largeText: boolean;
  onToggleSpeechReader: () => void;
  speechReader: boolean;
}

export default function ProfileView({
  profile,
  documents,
  onUpdateProfile,
  onLogout,
  onToggleHighContrast,
  highContrast,
  onToggleLargeText,
  largeText,
  onToggleSpeechReader,
  speechReader
}: ProfileViewProps) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [occupation, setOccupation] = useState(profile.occupation);
  const [language, setLanguage] = useState(profile.preferredLanguage);
  const [successMsg, setSuccessMsg] = useState("");
  const lang = profile.preferredLanguage || "English";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name,
      age: parseInt(age as any) || 0,
      occupation,
      preferredLanguage: language
    });
    setSuccessMsg(t("Profile updated successfully", lang));
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Compute Readiness
  const verifiedCount = documents.filter(d => d.status === "Verified").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="profile-root">
      
      {/* Left Column: Achievement cards & stats */}
      <div className="space-y-6" id="profile-left">
        
        {/* Citizen Card summary - Premium Purple Glassmorphism Identity Plate */}
        <div className="bg-gradient-to-br from-violet-950/40 via-black/50 to-indigo-950/30 border border-violet-500/25 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-[0_0_30px_rgba(124,58,237,0.1)]" id="citizen-digital-id-card">
          <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5" id="id-card-header">
            <div className="w-11 h-11 bg-violet-500/10 rounded-full flex items-center justify-center border border-violet-500/30 text-violet-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 block uppercase">{t("Republic of India", lang)}</span>
              <h4 className="text-sm font-bold text-white tracking-tight mt-0.5 font-display">{t("Smart Bharat ID", lang)}</h4>
            </div>
          </div>

          <div className="pt-6 space-y-4.5 text-xs font-sans" id="id-card-details">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">{t("Citizen Name", lang)}</span>
                <span className="text-slate-200 font-bold block mt-1 truncate">{profile.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">{t("Civic Location", lang)}</span>
                <span className="text-slate-200 font-bold block mt-1 truncate">{t(profile.city, lang)}, {t(profile.state, lang)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">{t("Occupation", lang)}</span>
                <span className="text-slate-200 font-bold block mt-1 truncate">{t(profile.occupation, lang)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">{t("Verified Proofs", lang)}</span>
                <span className="text-slate-200 font-bold block mt-1">{verifiedCount} {t("of", lang)} {documents.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-violet-500/10 flex justify-between items-center" id="id-card-footer">
            <span className="text-[8px] font-mono text-slate-500">SECURE SHA-256 DEMO NODE</span>
            <span className="inline-flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold font-sans">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> {t("ACTIVE", lang)}
            </span>
          </div>
        </div>

        {/* Badges rewards list */}
        <div className="bg-black/40 border border-violet-500/15 rounded-3xl p-6 backdrop-blur-md" id="profile-achievements">
          <h3 className="text-xs font-bold text-white tracking-wide uppercase mb-4 flex items-center gap-2 font-display">
            <Award className="w-4 h-4 text-amber-400" /> {t("Civic Badges Achieved", lang)}
          </h3>

          <div className="space-y-3" id="badges-list">
            {[
              { title: t("Satyamev Jayate", lang), desc: t("Successfully completed civic onboarding.", lang), earned: true, icon: "🎖️" },
              { title: t("Locker Guardian", lang), desc: t("Uploaded & verified at least two vault files.", lang), earned: verifiedCount >= 2, icon: "🛡️" },
              { title: t("Civic Watchdog", lang), desc: t("Reported a grievance to municipal department.", lang), earned: true, icon: "📢" }
            ].map(bdg => (
              <div
                key={bdg.title}
                className={`p-3.5 rounded-2xl border flex gap-3.5 items-center font-sans transition ${
                  bdg.earned
                    ? "bg-[#090416] border-violet-500/5"
                    : "bg-[#090416]/40 border-violet-500/5 opacity-45 select-none"
                }`}
              >
                <span className="text-2xl shrink-0">{bdg.earned ? bdg.icon : "🔒"}</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{bdg.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{bdg.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Middle Column: User settings fields */}
      <div className="lg:col-span-2 space-y-6" id="profile-middle">
        
        {/* Core Profile Edit Info */}
        <div className="bg-black/40 border border-violet-500/15 rounded-3xl p-6 backdrop-blur-md" id="profile-edit-info">
          <h3 className="text-xs font-bold text-white tracking-wide uppercase mb-4 flex items-center gap-2 font-display">
            <User className="w-4 h-4 text-violet-400" /> {t("Modify Citizen Details", lang)}
          </h3>

          <form onSubmit={handleSave} className="space-y-4" id="profile-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">{t("Legal Name", lang)}</label>
                <input
                  type="text"
                  className="w-full bg-black/40 border border-violet-500/20 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 font-sans"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">{t("Age", lang)}</label>
                <input
                  type="number"
                  className="w-full bg-black/40 border border-violet-500/20 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 font-sans"
                  value={age}
                  onChange={e => setAge(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">{t("Occupation", lang)}</label>
                <input
                  type="text"
                  className="w-full bg-black/40 border border-violet-500/20 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 font-sans"
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">{t("Preferred Language", lang)}</label>
                <select
                  className="w-full bg-black/40 border border-violet-500/20 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 font-sans [&>option]:bg-[#0d0720]"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                  <option value="Marathi (ಮರಾಠಿ)">Marathi (ಮರಾಠಿ)</option>
                  <option value="Kannada (ಕನ್ನಡ)">Kannada (ಕನ್ನಡ)</option>
                  <option value="Tamil (தமிழ்)">Tamil (தமிழ்)</option>
                  <option value="Telugu (ತೆಲುಗು)">Telugu (ತೆಲುಗು)</option>
                  <option value="Bengali (বাংলা)">Bengali (বাংলা)</option>
                  <option value="Gujarati (ગુજરાતી)">Gujarati (ગુજરાતી)</option>
                </select>
              </div>
            </div>

            {successMsg && (
              <p className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-1.5 font-sans">
                <Check className="w-4 h-4" /> {successMsg}
              </p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition shadow-[0_0_12px_rgba(124,58,237,0.25)] font-sans"
              >
                {t("Save Details", lang)}
              </button>
            </div>
          </form>
        </div>

        {/* Accessibility & Accessibility panel checks */}
        <div className="bg-black/40 border border-violet-500/15 rounded-3xl p-6 backdrop-blur-md" id="profile-accessibility">
          <h3 className="text-xs font-bold text-white tracking-wide uppercase mb-4 flex items-center gap-2 font-display">
            <Accessibility className="w-4 h-4 text-emerald-400" /> {t("Digital Accessibility & Assistive Modes", lang)}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="accessibility-toggles">
            
            {/* Toggles High Contrast */}
            <label
              onClick={onToggleHighContrast}
              className={`p-4 border rounded-2xl cursor-pointer text-center select-none transition flex flex-col justify-between h-[125px] font-sans ${
                highContrast
                  ? "border-violet-500 bg-[#0f0622]/80 shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                  : "bg-black/40 border border-violet-500/10 hover:border-violet-500/25"
              }`}
            >
              <Eye className={`w-5 h-5 mx-auto transition ${highContrast ? "text-violet-400" : "text-slate-400"}`} />
              <div>
                <h4 className="text-xs font-bold text-slate-200 block">{t("High Contrast", lang)}</h4>
                <span className="text-[9px] text-slate-500 mt-1 block leading-normal">{t("Boost visual outline contrast", lang)}</span>
              </div>
            </label>

            {/* Toggles Large Text */}
            <label
              onClick={onToggleLargeText}
              className={`p-4 border rounded-2xl cursor-pointer text-center select-none transition flex flex-col justify-between h-[125px] font-sans ${
                largeText
                  ? "border-violet-500 bg-[#0f0622]/80 shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                  : "bg-black/40 border border-violet-500/10 hover:border-violet-500/25"
              }`}
            >
              <Languages className={`w-5 h-5 mx-auto transition ${largeText ? "text-violet-400" : "text-slate-400"}`} />
              <div>
                <h4 className="text-xs font-bold text-slate-200 block">{t("Large Typography", lang)}</h4>
                <span className="text-[9px] text-slate-500 mt-1 block leading-normal">{t("Enlarged readability dimensions", lang)}</span>
              </div>
            </label>

            {/* Toggles Speech Output */}
            <label
              onClick={onToggleSpeechReader}
              className={`p-4 border rounded-2xl cursor-pointer text-center select-none transition flex flex-col justify-between h-[125px] font-sans ${
                speechReader
                  ? "border-violet-500 bg-[#0f0622]/80 shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                  : "bg-black/40 border border-violet-500/10 hover:border-violet-500/25"
              }`}
            >
              <Volume2 className={`w-5 h-5 mx-auto transition ${speechReader ? "text-violet-400" : "text-slate-400"}`} />
              <div>
                <h4 className="text-xs font-bold text-slate-200 block">{t("Civic TTS Assistant", lang)}</h4>
                <span className="text-[9px] text-slate-500 mt-1 block leading-normal">{t("AI voices speak screen captions", lang)}</span>
              </div>
            </label>

          </div>
        </div>

        {/* Logout area */}
        <div className="bg-black/40 border border-violet-500/15 rounded-3xl p-6 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4" id="profile-logout-bar">
          <div className="font-sans">
            <h4 className="text-xs font-bold text-slate-200">{t("Reset Application Storage", lang)}</h4>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{t("Clearing session storage wipes local identity profiles, vault files, and grievances.", lang)}</p>
          </div>
          <button
            onClick={onLogout}
            className="bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/15 text-rose-300 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer font-sans shrink-0"
          >
            <LogOut className="w-4 h-4" /> {t("Reset and Logout", lang)}
          </button>
        </div>

      </div>

    </div>
  );
}

import React, { useState, useEffect } from "react";
import { CitizenProfile } from "../types";
import { STATES_AND_CITIES, OCCUPATIONS, INCOME_BRACKETS } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { User, MapPin, Briefcase, Sparkles, Accessibility, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { t } from "../translations";

interface OnboardingProps {
  onComplete: (profile: CitizenProfile) => void;
  initialProfile: CitizenProfile;
}

export default function Onboarding({ onComplete, initialProfile }: OnboardingProps) {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<CitizenProfile>({
    ...initialProfile,
    preferredLanguage: initialProfile.preferredLanguage || "English"
  });
  const [selectedState, setSelectedState] = useState<string>("");
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    if (formData.state) {
      setSelectedState(formData.state);
      setCities(STATES_AND_CITIES[formData.state] || []);
    }
  }, [formData.state]);

  const handleStateChange = (stateName: string) => {
    setSelectedState(stateName);
    setCities(STATES_AND_CITIES[stateName] || []);
    setFormData(prev => ({
      ...prev,
      state: stateName,
      city: STATES_AND_CITIES[stateName]?.[0] || ""
    }));
  };

  const handleAgeChange = (ageVal: number) => {
    setFormData(prev => ({
      ...prev,
      age: ageVal,
      isSeniorCitizen: ageVal >= 60
    }));
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.age || !formData.gender) {
        alert(t("Please fill in your name, age, and gender.", formData.preferredLanguage));
        return;
      }
    }
    if (step === 2) {
      if (!formData.state || !formData.city) {
        alert(t("Please select your state and city.", formData.preferredLanguage));
        return;
      }
    }
    if (step < 4) {
      setStep(prev => prev + 1);
    } else {
      // Completed!
      onComplete({
        ...formData,
        hasOnboarded: true
      });
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const stepIcons = [
    <User className="w-5 h-5" id="step-icon-1" />,
    <MapPin className="w-5 h-5" id="step-icon-2" />,
    <Briefcase className="w-5 h-5" id="step-icon-3" />,
    <Accessibility className="w-5 h-5" id="step-icon-4" />
  ];

  const stepTitles = [
    t("Personal Profile", formData.preferredLanguage),
    t("Civic Geography", formData.preferredLanguage),
    t("Economic Status", formData.preferredLanguage),
    t("Accessibility & Confirm", formData.preferredLanguage)
  ];

  return (
    <div className="min-h-screen bg-elegant-bg text-white flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden" id="onboarding-root">
      {/* Decorative ambient background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-elegant-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-elegant-card border border-elegant-border rounded-3xl p-6 md:p-8 shadow-2xl z-10" id="onboarding-card">
        {/* App Branding */}
        <div className="text-center mb-8" id="onboarding-brand">
          <div className="inline-flex items-center justify-center p-3 bg-elegant-accent-bg border border-elegant-accent-border rounded-2xl mb-3 text-elegant-accent">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent font-display">
            Smart Bharat
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-sans">
            {t("Your AI Civic Companion • Build Your Profile", formData.preferredLanguage)}
          </p>
        </div>

        {/* Progress Timeline */}
        <div className="flex justify-between items-center mb-8 px-2" id="onboarding-progress">
          {stepIcons.map((icon, idx) => {
            const num = idx + 1;
            const isActive = step === num;
            const isCompleted = step > num;
            return (
              <React.Fragment key={num}>
                <div className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      isActive
                        ? "bg-elegant-accent border-elegant-accent/80 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                        : isCompleted
                        ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                        : "bg-elegant-bg border-elegant-border text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : icon}
                  </div>
                  <span className="text-[10px] md:text-xs mt-2 text-slate-400 font-medium hidden sm:block font-sans">
                    {stepTitles[idx]}
                  </span>
                </div>
                {idx < 3 && (
                  <div className="flex-1 h-[2px] mx-2 bg-elegant-border relative">
                    <div
                      className="absolute top-0 left-0 h-full bg-elegant-accent transition-all duration-300"
                      style={{ width: step > num ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Multi-step Form Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25 }}
            className="min-h-[250px] flex flex-col justify-between"
          >
            {step === 1 && (
              <div className="space-y-4" id="onboarding-step-1 font-sans">
                <h3 className="text-lg font-semibold text-elegant-accent flex items-center gap-2 font-display">
                  <User className="w-4 h-4" /> {t("Let's get to know you", formData.preferredLanguage)}
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  {t("Your demographic profile helps us instantly filter hundreds of central and state welfare programs.", formData.preferredLanguage)}
                </p>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                      {t("Full Legal Name", formData.preferredLanguage)}
                    </label>
                    <input
                      type="text"
                      className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-accent focus:ring-1 focus:ring-elegant-accent font-sans"
                      placeholder="e.g., Rajesh Kumar"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                        {t("Age (Years)", formData.preferredLanguage)}
                      </label>
                      <input
                        type="number"
                        className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-accent focus:ring-1 focus:ring-elegant-accent font-sans"
                        placeholder="e.g., 28"
                        value={formData.age || ""}
                        onChange={e => handleAgeChange(parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                        {t("Gender", formData.preferredLanguage)}
                      </label>
                      <select
                        className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-accent focus:ring-1 focus:ring-elegant-accent font-sans"
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      >
                        <option value="">{t("Select Gender", formData.preferredLanguage)}</option>
                        <option value="Male">{t("Male", formData.preferredLanguage)}</option>
                        <option value="Female">{t("Female", formData.preferredLanguage)}</option>
                        <option value="Third Gender / Non-Binary">{t("Third Gender / Non-Binary", formData.preferredLanguage)}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4" id="onboarding-step-2 font-sans">
                <h3 className="text-lg font-semibold text-elegant-accent flex items-center gap-2 font-display">
                  <MapPin className="w-4 h-4" /> {t("Where are you located?", formData.preferredLanguage)}
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  {t("Subsidies, licensing, and civic departments are highly state-specific. Select your state and closest city.", formData.preferredLanguage)}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                      {t("Indian State", formData.preferredLanguage)}
                    </label>
                    <select
                      className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-accent focus:ring-1 focus:ring-elegant-accent font-sans"
                      value={selectedState}
                      onChange={e => handleStateChange(e.target.value)}
                    >
                      <option value="">{t("Select State", formData.preferredLanguage)}</option>
                      {Object.keys(STATES_AND_CITIES).map(st => (
                        <option key={st} value={st}>
                          {t(st, formData.preferredLanguage)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                      {t("City / District", formData.preferredLanguage)}
                    </label>
                    <select
                      className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-accent focus:ring-1 focus:ring-elegant-accent font-sans"
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      disabled={!selectedState}
                    >
                      <option value="">{t("Select City", formData.preferredLanguage)}</option>
                      {cities.map(ct => (
                        <option key={ct} value={ct}>
                          {t(ct, formData.preferredLanguage)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4" id="onboarding-step-3 font-sans">
                <h3 className="text-lg font-semibold text-elegant-accent flex items-center gap-2 font-display">
                  <Briefcase className="w-4 h-4" /> {t("Work & Income Parameters", formData.preferredLanguage)}
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  {t("Many government schemes have strict income caps or target professional groups. We never share this data.", formData.preferredLanguage)}
                </p>

                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                        {t("Primary Occupation", formData.preferredLanguage)}
                      </label>
                      <select
                        className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-accent focus:ring-1 focus:ring-elegant-accent font-sans"
                        value={formData.occupation}
                        onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                      >
                        <option value="">{t("Select Occupation", formData.preferredLanguage)}</option>
                        {OCCUPATIONS.map(occ => (
                          <option key={occ} value={occ}>
                            {t(occ, formData.preferredLanguage)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                        {t("Household Annual Income", formData.preferredLanguage)}
                      </label>
                      <select
                        className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-accent focus:ring-1 focus:ring-elegant-accent font-sans"
                        value={formData.income}
                        onChange={e => setFormData({ ...formData, income: e.target.value })}
                      >
                        <option value="">{t("Select Annual Income", formData.preferredLanguage)}</option>
                        {INCOME_BRACKETS.map(inc => (
                          <option key={inc} value={inc}>
                            {t(inc, formData.preferredLanguage)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1 font-sans">
                      {t("Select applicable categories:", formData.preferredLanguage)}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-3 p-3 bg-elegant-bg/50 hover:bg-elegant-bg border border-elegant-border rounded-xl cursor-pointer select-none transition font-sans">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-elegant-accent"
                          checked={formData.isStudent}
                          onChange={e => setFormData({ ...formData, isStudent: e.target.checked })}
                        />
                        <span className="text-xs text-slate-300 font-sans">
                          {t("Active Student", formData.preferredLanguage)}
                        </span>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-elegant-bg/50 hover:bg-elegant-bg border border-elegant-border rounded-xl cursor-pointer select-none transition font-sans">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-elegant-accent"
                          checked={formData.isBusinessOwner}
                          onChange={e => setFormData({ ...formData, isBusinessOwner: e.target.checked })}
                        />
                        <span className="text-xs text-slate-300 font-sans">
                          {t("Business Owner / MSME", formData.preferredLanguage)}
                        </span>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-elegant-bg/50 hover:bg-elegant-bg border border-elegant-border rounded-xl cursor-pointer select-none transition font-sans">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-elegant-accent"
                          checked={formData.isFarmer}
                          onChange={e => setFormData({ ...formData, isFarmer: e.target.checked })}
                        />
                        <span className="text-xs text-slate-300 font-sans">
                          {t("Farmer / Landowner", formData.preferredLanguage)}
                        </span>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-elegant-bg/50 hover:bg-elegant-bg border border-elegant-border rounded-xl cursor-pointer select-none transition-all font-sans">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-elegant-accent"
                          checked={formData.isSeniorCitizen}
                          onChange={e => setFormData({ ...formData, isSeniorCitizen: e.target.checked })}
                        />
                        <span className="text-xs text-slate-300 font-sans">
                          {t("Senior Citizen (60+)", formData.preferredLanguage)}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4" id="onboarding-step-4 font-sans">
                <h3 className="text-lg font-semibold text-elegant-accent flex items-center gap-2 font-display">
                  <Accessibility className="w-4 h-4" /> {t("Preferences & Customization", formData.preferredLanguage)}
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  {t("Select accessibility settings and preferred language for AI voice responses.", formData.preferredLanguage)}
                </p>

                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                        {t("Language", formData.preferredLanguage)}
                      </label>
                      <select
                        className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-accent font-sans"
                        value={formData.preferredLanguage}
                        onChange={e => setFormData({ ...formData, preferredLanguage: e.target.value })}
                      >
                        <option value="English">English</option>
                        <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                        <option value="Marathi (मराठी)">Marathi (मराठी)</option>
                        <option value="Kannada (ಕನ್ನಡ)">Kannada (ಕನ್ನಡ)</option>
                        <option value="Tamil (தமிழ்)">Tamil (தமிழ்)</option>
                        <option value="Telugu (తెలుగు)">Telugu (తెలుగు)</option>
                        <option value="Bengali (বাংলা)">Bengali (বাংলা)</option>
                        <option value="Gujarati (ગુજરાતી)">Gujarati (ગુજરાતી)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                        {t("Disability Accommodation (Optional)", formData.preferredLanguage)}
                      </label>
                      <select
                        className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-accent font-sans"
                        value={formData.disability || ""}
                        onChange={e => setFormData({ ...formData, disability: e.target.value || undefined })}
                      >
                        <option value="">{t("None", formData.preferredLanguage)}</option>
                        <option value="Locomotor (Physical)">Locomotor (Physical Disability)</option>
                        <option value="Visual Impairment">Visual Impairment / Blindness</option>
                        <option value="Hearing Impairment">Hearing Impairment / Deafness</option>
                        <option value="Intellectual Disability">Intellectual Disability</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-elegant-accent-bg border border-elegant-accent-border rounded-xl flex items-start gap-3 mt-4 font-sans">
                    <Sparkles className="w-5 h-5 text-elegant-accent mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-elegant-accent">
                        {t("Ready to Launch!", formData.preferredLanguage)}
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 font-sans">
                        {t("By confirming, Smart Bharat AI will instantly calculate your Government Readiness Score, scan 400+ schemes, and customize the interface to serve you.", formData.preferredLanguage)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step navigation buttons */}
            <div className="flex justify-between items-center pt-8 border-t border-elegant-border mt-6" id="onboarding-nav">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-elegant-border hover:bg-elegant-card transition font-sans ${
                  step === 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer text-slate-300 hover:text-white"
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> {t("Back", formData.preferredLanguage)}
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 bg-elegant-accent hover:bg-elegant-accent/90 text-white px-6 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition shadow-lg font-sans"
              >
                {step === 4 ? t("Complete Profile", formData.preferredLanguage) : t("Continue", formData.preferredLanguage)} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}


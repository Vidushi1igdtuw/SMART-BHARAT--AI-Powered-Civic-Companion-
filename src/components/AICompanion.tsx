import React, { useState, useEffect, useRef } from "react";
import { CitizenProfile, ActionPlan, RoadmapStep, VaultDocument } from "../types";
import { Sparkles, MessageSquare, Mic, MicOff, Send, Calendar, Landmark, Coins, FileCheck, CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../translations";

interface AICompanionProps {
  profile: CitizenProfile;
  currentPlan: ActionPlan | null;
  onPlanGenerated: (plan: ActionPlan) => void;
  onAddNotification: (title: string, body: string, cat: 'scheme' | 'document' | 'complaint' | 'system') => void;
  documents?: VaultDocument[];
}

const LIFE_EVENTS = [
  { label: "I got married", id: "marriage", icon: "💍", desc: "Register marriage & update identity files" },
  { label: "I started a business", id: "business", icon: "💼", desc: "Udyam, GST registrations & current accounts" },
  { label: "I bought a house", id: "house", icon: "🏠", desc: "Property registry & municipal tax record alignment" },
  { label: "I moved to another city", id: "move", icon: "🚚", desc: "Aadhaar address alteration & voter shifts" },
  { label: "I had a baby", id: "baby", icon: "👶", desc: "Birth certificate registration & health cards" },
  { label: "I lost my documents", id: "lost_docs", icon: "⚠️", desc: "Online FIR and replacement procedures" },
  { label: "I retired", id: "retired", icon: "👴", desc: "Pension certificates & senior card upgrades" },
  { label: "I want a passport", id: "passport", icon: "✈️", desc: "Application steps, PSK slots & police checks" },
  { label: "I want a driving licence", id: "driving", icon: "🚗", desc: "Learner files, test bookings & RTO visits" },
  { label: "I need financial help", id: "subsidy", icon: "🪙", desc: "Welfare cards, schemes, and direct transfers" }
];

export default function AICompanion({
  profile,
  currentPlan,
  onPlanGenerated,
  onAddNotification,
  documents = []
}: AICompanionProps) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const lang = profile.preferredLanguage || "English";

  const [activeMode, setActiveMode] = useState<"roadmap" | "chat">("roadmap");
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: "user" | "assistant";
    text: string;
    route?: "CIVIC" | "WEBSITE" | "GENERAL";
    explanation?: string;
    suggestedActions?: string[];
    timestamp: Date;
  }>>(() => {
    const saved = localStorage.getItem("sb_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (err) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("sb_chat_history", JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Voice Input Speech recognition states
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      const langMapping: Record<string, string> = {
        "English": "en-IN",
        "Hindi (हिन्दी)": "hi-IN",
        "Marathi (मराठी)": "mr-IN",
        "Kannada (ಕನ್ನಡ)": "kn-IN",
        "Tamil (தமிழ்)": "ta-IN",
        "Telugu (తెలుగు)": "te-IN",
        "Bengali (বাংলা)": "bn-IN",
        "Gujarati (ગુೂಜರಾತಿ)": "gu-IN"
      };
      rec.lang = langMapping[profile.preferredLanguage] || "en-IN";

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => (prev ? prev + " " + transcript : transcript));
        setIsRecording(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, [profile.preferredLanguage]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert(t("Speech recognition is not supported in this browser or iframe. Please type your query.", lang));
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleTriggerEvent = async (eventText: string) => {
    setLoading(true);
    setExpandedStep(null);
    setActiveMode("roadmap");
    try {
      const response = await fetch("/api/gemini/action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          event: eventText
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact civic companion engine");
      }

      const data = await response.json();
      
      // Complete action plan item
      const actionPlan: ActionPlan = {
        theme: data.theme || "indigo",
        summary: data.summary || "Here is your personalized roadmap:",
        roadmap: data.roadmap || [],
        tips: data.tips || [],
        lifeEvent: eventText
      };

      onPlanGenerated(actionPlan);
      onAddNotification(
        t("Plan Generated", lang) + `: ${t(eventText, lang)}`,
        t("Your personalized action plan is ready in your Companion tab.", lang),
        "system"
      );

    } catch (err) {
      console.error("Error generating roadmap:", err);
      alert(t("We encountered an issue communicating with the AI. Loading mock fallback roadmap.", lang));
    } finally {
      setLoading(false);
    }
  };

  const handleChatQuery = async (queryText: string) => {
    setLoading(true);
    setActiveMode("chat");
    
    // Append user message immediately
    const userMsg = {
      id: "msg-" + Date.now() + "-user",
      sender: "user" as const,
      text: queryText,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setInputText("");

    // Construct simplified history array for Gemini context window
    const history = chatMessages.map(m => ({
      role: m.sender === "user" ? "user" : "model",
      content: m.text
    }));

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          query: queryText,
          history
        })
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();

      const assistantMsg = {
        id: "msg-" + Date.now() + "-asst",
        sender: "assistant" as const,
        text: data.response || "No response generated.",
        route: data.route as any,
        explanation: data.explanation,
        suggestedActions: data.suggestedActions || [],
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMsg]);

    } catch (err) {
      console.error("Chat companion error:", err);
      const errorMsg = {
        id: "msg-" + Date.now() + "-asst",
        sender: "assistant" as const,
        text: t("Sorry, I could not complete that request. Please verify your connection or retry later.", lang),
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleChatQuery(inputText.trim());
  };

  const handleToggleStepStatus = (stepNum: number) => {
    if (!currentPlan) return;
    const updatedRoadmap = currentPlan.roadmap.map(step => {
      if (step.step === stepNum) {
        const newStatus: RoadmapStep['status'] = step.status === "completed" ? "pending" : "completed";
        return { ...step, status: newStatus };
      }
      return step;
    });

    onPlanGenerated({
      ...currentPlan,
      roadmap: updatedRoadmap
    });

    // Send visual notification if step gets completed
    const justCompleted = updatedRoadmap.find(s => s.step === stepNum && s.status === "completed");
    if (justCompleted) {
      onAddNotification(
        t("Step Completed!", lang),
        t("You marked step as complete. Keep going!", lang),
        "system"
      );
    }
  };

  // Set visual colors according to the generated AI theme
  const getThemeClasses = (theme: string) => {
    switch (theme) {
      case "rose": return { text: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/10", hover: "hover:border-rose-500/40", button: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" };
      case "emerald": return { text: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10", hover: "hover:border-emerald-500/40", button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" };
      case "amber": return { text: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/10", hover: "hover:border-amber-500/40", button: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" };
      case "purple": return { text: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/10", hover: "hover:border-purple-500/40", button: "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20" };
      case "sky": return { text: "text-sky-400", border: "border-sky-500/20", bg: "bg-sky-500/10", hover: "hover:border-sky-500/40", button: "bg-sky-600 hover:bg-sky-700 shadow-sky-600/20" };
      case "violet": return { text: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/10", hover: "hover:border-violet-500/40", button: "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20" };
      case "blue": return { text: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10", hover: "hover:border-blue-500/40", button: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20" };
      default: return { text: "text-violet-400", border: "border-violet-500/15", bg: "bg-violet-950/10", hover: "hover:border-violet-500/30", button: "bg-violet-600 hover:bg-violet-500 shadow-violet-600/20" };
    }
  };

  const themeCls = getThemeClasses(currentPlan?.theme || "indigo");

  // Derive details from currentPlan for the interactive citizen journey dashboard
  const totalSteps = currentPlan?.roadmap.length || 0;
  const completedSteps = currentPlan?.roadmap.filter(s => s.status === "completed").length || 0;
  const pendingSteps = totalSteps - completedSteps;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Gather all unique required documents across steps
  const allRequiredDocs = Array.from(new Set(
    currentPlan?.roadmap.flatMap(s => s.documentsNeeded || []) || []
  )).filter(Boolean);

  // Gather unique government offices/portals
  const uniqueOffices = Array.from(new Set(
    currentPlan?.roadmap.map(s => s.office).filter(Boolean) || []
  ));

  // Determine estimated total time
  const timeEstimates = currentPlan?.roadmap.map(s => s.timeRequired).filter(Boolean) || [];
  const displayEstTime = timeEstimates.length > 0 ? timeEstimates[timeEstimates.length - 1] : "1-3 days";

  // Check if a document is present in the vault
  const isDocInVault = (docName: string) => {
    const normalized = docName.toLowerCase();
    return documents.some(d => {
      const dName = d.name.toLowerCase();
      return dName.includes(normalized) || normalized.includes(dName) ||
             (normalized.includes("aadhaar") && dName.includes("aadhaar")) ||
             (normalized.includes("pan") && dName.includes("pan")) ||
             (normalized.includes("passport") && dName.includes("passport")) ||
             (normalized.includes("licence") && dName.includes("licence")) ||
             (normalized.includes("license") && dName.includes("licence")) ||
             (normalized.includes("voter") && dName.includes("voter")) ||
             (normalized.includes("birth") && dName.includes("birth"));
    });
  };

  return (
    <div className="space-y-6" id="companion-root">
      
      {/* Intro Question Area */}
      <div className="bg-black/40 border border-violet-500/15 backdrop-blur-md rounded-3xl p-6 relative overflow-hidden" id="companion-intro-header">
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-xl" id="companion-intro-text">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
            {t("What occurred in your life today? Select any card or enter custom goals.", lang)} <Sparkles className="w-5 h-5 text-violet-400" />
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-sans">
            {t("Select an event card or describe what you want to achieve. Smart Bharat AI parses complex Indian government guidelines to generate custom step-by-step roadmaps.", lang)}
          </p>
        </div>

        {/* Dynamic event Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6" id="companion-events-grid">
          {LIFE_EVENTS.map(ev => (
            <button
              key={ev.id}
              onClick={() => handleTriggerEvent(ev.label)}
              disabled={loading}
              className="bg-black/45 hover:bg-[#110729]/60 border border-violet-500/10 hover:border-violet-500/30 p-3.5 rounded-2xl text-left cursor-pointer transition flex flex-col justify-between group h-[106px] text-slate-300 disabled:opacity-50 font-sans shadow-sm"
            >
              <span className="text-xl shrink-0 transition-transform group-hover:scale-110">{ev.icon}</span>
              <div>
                <h4 className="text-[10px] font-bold text-white line-clamp-1 mt-1.5 font-sans tracking-wide">{t(ev.label, lang)}</h4>
                <p className="text-[8px] text-slate-400 mt-0.5 line-clamp-2 font-sans leading-normal">{t(ev.desc, lang)}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Speech & Custom input Bar */}
        <form onSubmit={handleSubmitCustom} className="mt-5 flex gap-2" id="companion-input-form">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t("Ask anything or type a life event...", lang)}
              className="w-full bg-black/40 border border-violet-500/20 rounded-2xl px-4 py-3.5 pr-12 text-white text-xs focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40 font-sans"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={toggleRecording}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition ${
                isRecording ? "bg-rose-500 text-white animate-pulse font-sans" : "text-slate-400 hover:text-slate-200"
              }`}
              title={t("Speech Assistant", lang)}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold transition shrink-0 font-sans shadow-[0_0_15px_rgba(124,58,237,0.25)]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("Generate Custom Plan", lang)}
          </button>
        </form>
      </div>

      {/* Toggle Mode if both are available */}
      {(currentPlan || chatMessages.length > 0) && (
        <div className="flex justify-center gap-3 bg-black/40 border border-violet-500/15 p-1.5 rounded-2xl max-w-md mx-auto backdrop-blur-md" id="companion-mode-toggles">
          {currentPlan && (
            <button
              onClick={() => setActiveMode("roadmap")}
              className={`flex-1 text-xs px-4 py-2.5 rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-1.5 font-sans ${
                activeMode === "roadmap"
                  ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)] border border-violet-500/30"
                  : "bg-transparent text-slate-400 hover:text-white"
              }`}
            >
              📋 {t("Custom Action Plan", lang)}
            </button>
          )}
          <button
            onClick={() => setActiveMode("chat")}
            className={`flex-1 text-xs px-4 py-2.5 rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-1.5 font-sans ${
              activeMode === "chat" || (!currentPlan && chatMessages.length === 0)
                ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)] border border-violet-500/30"
                : "bg-transparent text-slate-400 hover:text-white"
            }`}
          >
            💬 {t("AI Conversations", lang)} {chatMessages.length > 0 ? `(${chatMessages.length})` : ""}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4" id="companion-skeleton">
          <div className="p-6 bg-black/40 border border-violet-500/15 rounded-3xl animate-pulse space-y-3">
            <div className="h-4 bg-violet-950/20 rounded-full w-2/3" />
            <div className="h-3 bg-violet-950/20 rounded-full w-1/2" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="p-5 bg-black/40 border border-violet-500/15 rounded-2xl animate-pulse flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-violet-950/20 rounded-full w-1/4" />
                  <div className="h-2.5 bg-violet-950/20 rounded-full w-1/2" />
                </div>
                <div className="h-6 bg-violet-950/20 rounded-xl w-16" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan or Chat Output */}
      <AnimatePresence mode="wait">
        {!loading && activeMode === "roadmap" && currentPlan && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            id="companion-plan-output"
          >
            {/* Visual Roadmap Banner - Comprehensive AI Citizen Journey Dashboard */}
            <div className="bg-black/40 border border-violet-500/15 backdrop-blur-md rounded-3xl p-6 relative overflow-hidden font-sans" id="companion-plan-banner">
              <div className="absolute top-[-20%] left-[-20%] w-[350px] h-[350px] bg-violet-500/5 rounded-full blur-[90px] pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-violet-500/10 pb-5">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider bg-violet-950/40 px-2.5 py-1 rounded-lg border border-violet-500/20 text-violet-400 font-mono`}>
                    🎯 {t("AI Citizen Journey", lang)} • {t(currentPlan.lifeEvent, lang)}
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-2.5 font-display">
                    {t(currentPlan.lifeEvent, lang)} {t("Journey Tracker", lang)}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1 font-sans">
                    {currentPlan.summary}
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-black/20 border border-violet-500/10 p-4 rounded-2xl min-w-[210px] justify-between shrink-0">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{t("Progress", lang)}</span>
                    <span className="text-2xl font-black text-emerald-400 font-sans">{progressPercent}%</span>
                  </div>
                  {/* Circle progress bar */}
                  <div className="relative w-12 h-12">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#13072b]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-400 transition-all duration-500 ease-out"
                        strokeDasharray={`${progressPercent}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Progress percentage bar */}
              <div className="mt-4">
                <div className="w-full bg-[#13072b] h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* Journey Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-[#090416] border border-violet-500/10 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-sans">{t("Total Tasks", lang)}</span>
                  <span className="text-xs font-bold text-slate-100 block mt-1.5 font-sans">{totalSteps} {t("Steps", lang)}</span>
                </div>
                <div className="bg-[#090416] border border-violet-500/10 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-sans">{t("Completed Tasks", lang)}</span>
                  <span className="text-xs font-bold text-emerald-400 block mt-1.5 font-sans">{completedSteps} {t("Done", lang)}</span>
                </div>
                <div className="bg-[#090416] border border-violet-500/10 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-sans">{t("Pending Tasks", lang)}</span>
                  <span className="text-xs font-bold text-amber-400 block mt-1.5 font-sans">{pendingSteps} {t("Remaining", lang)}</span>
                </div>
                <div className="bg-[#090416] border border-violet-500/10 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-sans">{t("Est. Processing Time", lang)}</span>
                  <span className="text-xs font-bold text-slate-200 block mt-1.5 truncate font-sans">{displayEstTime}</span>
                </div>
              </div>

              {/* Required Documents Checklist and Offices Involved Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-5 border-t border-violet-500/10">
                
                {/* Document Checker */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <FileCheck className="w-4 h-4 text-violet-400" /> {t("Journey Documents Tracker", lang)}
                  </h4>
                  {allRequiredDocs.length > 0 ? (
                    <div className="space-y-2">
                      {allRequiredDocs.map((doc, idx) => {
                        const verified = isDocInVault(doc);
                        return (
                          <div key={idx} className="flex items-center justify-between bg-[#090416] border border-violet-500/5 px-3.5 py-2.5 rounded-xl font-sans">
                            <span className="text-xs font-medium text-slate-200 truncate pr-2">{t(doc, lang)}</span>
                            {verified ? (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg shrink-0 font-sans flex items-center gap-0.5">
                                ✓ {t("Verified Vault Scanned", lang)}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0 font-sans flex items-center gap-0.5">
                                ⚠️ {t("Missing in Vault", lang)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic font-sans">{t("No documents required for this specific life event.", lang)}</p>
                  )}
                </div>

                {/* Offices and AI Recommendation Summary */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-sans">
                      <Landmark className="w-4 h-4 text-pink-400" /> {t("Government Offices & Portals", lang)}
                    </h4>
                    {uniqueOffices.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueOffices.map((office, idx) => (
                          <span key={idx} className="text-[10px] bg-[#090416] border border-violet-500/10 text-slate-300 px-3 py-1.5 rounded-xl font-medium font-sans block">
                            🏛️ {office}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic font-sans">{t("All procedures can be completed 100% online.", lang)}</p>
                    )}
                  </div>

                  <div className="p-4 bg-violet-950/10 border border-violet-500/10 rounded-2xl">
                    <h5 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1 font-sans">{t("AI Recommendation", lang)}</h5>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      {t("Complete required tasks chronologically. Keep scanned Aadhaar, PAN and permanent address proofs ready in your Document Vault to automatically autofill official application forms.", lang)}
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Sequence Line RoadMap */}
            <div className="space-y-4 font-sans" id="companion-roadmap-list">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 font-display">
                {t("Personalized Action Steps", lang)}
              </h3>
              
              <div className="relative border-l border-violet-500/10 ml-4 pl-6 space-y-6" id="roadmap-timeline">
                {currentPlan.roadmap.map((step, idx) => {
                  const isDone = step.status === "completed";
                  const isExpanded = expandedStep === step.step;
                  
                  return (
                    <div key={step.step} className="relative group" id={`roadmap-step-card-${step.step}`}>
                      
                      {/* Interactive Dot */}
                      <button
                        onClick={() => handleToggleStepStatus(step.step)}
                        className={`absolute left-[-31px] top-1.5 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all bg-[#090416] cursor-pointer ${
                          isDone
                            ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                            : "border-violet-500/20 hover:border-violet-400"
                        }`}
                        title={isDone ? t("Pending", lang) : t("Completed", lang)}
                      >
                        {isDone && <span className="w-2 h-2 bg-emerald-400 rounded-full" />}
                      </button>

                      {/* Step Card Content */}
                      <div className={`bg-black/30 border transition-all duration-300 rounded-2xl p-5 font-sans ${
                        isDone ? "border-violet-500/5 opacity-60" : "border-violet-500/10 hover:border-violet-500/25 hover:bg-[#0d0720]/40"
                      }`}>
                        
                        {/* Header Details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">{t("Step", lang)} {step.step}</span>
                            <h4 className={`text-xs font-bold mt-1.5 font-sans ${isDone ? "text-slate-400 line-through" : "text-slate-100"}`}>
                              {step.title}
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Expand toggle */}
                            <button
                              onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                              className="text-[10px] font-bold px-3 py-1.5 text-violet-400 hover:text-violet-300 flex items-center gap-1 border border-violet-500/10 hover:border-violet-500/25 rounded-xl bg-[#090416] transition cursor-pointer font-sans"
                            >
                              {isExpanded ? t("Hide Details", lang) : t("View Steps", lang)} 
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable node details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4 mt-4 border-t border-violet-500/10 space-y-4 text-xs text-slate-300 font-sans">
                                
                                {/* Step description */}
                                <p className="leading-relaxed text-slate-300 font-medium bg-black/25 p-3.5 rounded-xl border border-violet-500/5">
                                  {step.description}
                                </p>

                                {/* Technical metadata cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="bg-[#090416] border border-violet-500/5 p-3 rounded-xl flex items-start gap-2">
                                    <Landmark className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">{t("Office/Portal:", lang)}</span>
                                      <span className="text-[10px] font-bold text-slate-200 block mt-0.5 font-sans">{step.office}</span>
                                    </div>
                                  </div>

                                  <div className="bg-[#090416] border border-violet-500/5 p-3 rounded-xl flex items-start gap-2">
                                    <Coins className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">{t("Estimated Fees:", lang)}</span>
                                      <span className="text-[10px] font-bold text-slate-200 block mt-0.5 font-sans">{step.estimatedFees}</span>
                                    </div>
                                  </div>

                                  <div className="bg-[#090416] border border-violet-500/5 p-3 rounded-xl flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">{t("Time Required:", lang)}</span>
                                      <span className="text-[10px] font-bold text-slate-200 block mt-0.5 font-sans">{step.timeRequired}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Required Documents */}
                                {step.documentsNeeded && step.documentsNeeded.length > 0 && (
                                  <div className="bg-black/15 border border-violet-500/5 p-3.5 rounded-xl">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2.5 font-sans">
                                      <FileCheck className="w-3.5 h-3.5 text-violet-400" /> {t("Required Documents:", lang)}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {step.documentsNeeded.map((doc, dIdx) => (
                                        <span key={dIdx} className="text-[9px] bg-[#090416] px-2.5 py-1 border border-violet-500/10 rounded-lg text-slate-300 font-semibold font-sans">
                                          {t(doc, lang)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* External navigation button */}
                                {step.actionButtonLabel && (
                                  <div className="flex justify-end pt-2">
                                    <a
                                      href="https://www.india.gov.in"
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold text-white px-4.5 py-2.5 rounded-xl transition cursor-pointer shadow-lg font-sans ${themeCls.button}`}
                                    >
                                      {t(step.actionButtonLabel, lang)}
                                    </a>
                                  </div>
                                )}

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart tips block */}
            {currentPlan.tips && currentPlan.tips.length > 0 && (
              <div className="p-5 bg-violet-950/10 border border-violet-500/10 rounded-3xl" id="companion-tips">
                <h4 className="text-xs font-bold text-violet-400 flex items-center gap-1.5 mb-3 font-sans">
                  <Info className="w-4 h-4 text-violet-400" /> {t("AI Pro-Tips", lang)}
                </h4>
                <ul className="space-y-2 list-disc pl-4 text-xs text-slate-400 font-sans">
                  {currentPlan.tips.map((tip, tIdx) => (
                    <li key={tIdx} className="leading-relaxed font-sans text-slate-400">
                      {t(tip, lang)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </motion.div>
        )}

        {!loading && (activeMode === "chat" || (!currentPlan && chatMessages.length > 0)) && chatMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
            id="companion-chat-history"
          >
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">
                {t("AI Conversation History", lang)}
              </h3>
              <button
                onClick={() => setChatMessages([])}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold font-sans cursor-pointer transition"
              >
                {t("Clear History", lang)}
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto p-4 bg-black/40 border border-violet-500/15 rounded-3xl backdrop-blur-md" id="chat-messages-container">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    id={`chat-msg-${msg.id}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 font-sans ${
                      isUser
                        ? "bg-violet-600 text-white rounded-tr-none border border-violet-500/30 shadow-[0_0_12px_rgba(124,58,237,0.15)]"
                        : "bg-[#090416]/90 border border-violet-500/10 rounded-tl-none text-slate-200"
                    }`}>
                      {/* Assistant Route Classification */}
                      {!isUser && msg.route && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                          <span className={`text-[8px] font-bold px-2.5 py-1 rounded-lg uppercase ${
                            msg.route === "CIVIC"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : msg.route === "WEBSITE"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                          }`}>
                            🎯 {t(msg.route, lang)}
                          </span>
                          {msg.explanation && (
                            <span className="text-[10px] text-slate-400 italic">
                              {msg.explanation}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="space-y-1">
                        {isUser ? (
                          <p className="text-xs font-sans leading-relaxed whitespace-pre-line">{msg.text}</p>
                        ) : (
                          renderMarkdown(msg.text)
                        )}
                      </div>

                      {/* Suggested actions inside assistant message */}
                      {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-violet-500/10 space-y-2">
                          <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider block">
                            {t("Suggested Actions", lang)}:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.suggestedActions.map((action, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setInputText(action);
                                }}
                                className="bg-black/30 hover:bg-[#12082d] border border-violet-500/10 hover:border-violet-500/25 text-[10px] font-bold px-3 py-1.5 rounded-xl text-slate-300 hover:text-white transition cursor-pointer font-sans"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simple regex markdown parsers
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeContent: string[] = [];

  return lines.map((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const code = codeContent.join("\n");
        codeContent = [];
        return (
          <pre key={index} className="bg-slate-950 border border-violet-500/10 p-3.5 rounded-xl overflow-x-auto text-[10px] font-mono text-violet-300 my-2">
            <code>{code}</code>
          </pre>
        );
      } else {
        inCodeBlock = true;
        return null;
      }
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return null;
    }

    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const cleanLine = line.trim().substring(2);
      return (
        <li key={index} className="list-disc pl-4 text-xs text-slate-300 my-1 leading-relaxed font-sans">
          {parseInlineMarkdown(cleanLine)}
        </li>
      );
    }
    
    const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      return (
        <div key={index} className="flex gap-2 text-xs text-slate-300 my-1.5 leading-relaxed pl-1 font-sans">
          <span className="font-bold text-violet-400 shrink-0">{numMatch[1]}.</span>
          <span>{parseInlineMarkdown(numMatch[2])}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={index} className="h-2" />;
    }

    return (
      <p key={index} className="text-xs text-slate-300 leading-relaxed my-1.5 font-sans">
        {parseInlineMarkdown(line)}
      </p>
    );
  });
}

function parseInlineMarkdown(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  if (parts.length === 1) return text;
  
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-white">{part}</strong>;
    }
    const codeParts = part.split(/`([^`]+)`/g);
    return codeParts.map((cp, ci) => {
      if (ci % 2 === 1) {
        return <code key={ci} className="bg-black/40 text-violet-300 px-1 py-0.5 rounded font-mono text-[10px] border border-violet-500/5">{cp}</code>;
      }
      return cp;
    });
  });
}

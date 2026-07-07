import React from "react";
import { CitizenProfile, VaultDocument, CivicGrievance, Scheme, CivicCalendarEvent } from "../types";
import { Sparkles, FileWarning, CheckCircle, Clock, AlertCircle, Plus, Send, ChevronRight, Award, Zap, X } from "lucide-react";
import { motion } from "motion/react";
import { t, translateCalendarEvent, translateVaultDocument, translateGrievance } from "../translations";

interface DashboardProps {
  profile: CitizenProfile;
  documents: VaultDocument[];
  complaints: CivicGrievance[];
  schemes: Scheme[];
  calendarEvents: CivicCalendarEvent[];
  onNavigate: (tab: string) => void;
  onAddTaskScore: () => void;
  completedTasks: string[];
  onToggleTask: (taskId: string) => void;
}

export default function Dashboard({
  profile,
  documents,
  complaints,
  schemes,
  calendarEvents,
  onNavigate,
  completedTasks,
  onToggleTask
}: DashboardProps) {
  const lang = profile.preferredLanguage || "English";

  const [showWeeklyReport, setShowWeeklyReport] = React.useState(() => {
    // Show automatically only once per session so it doesn't interrupt navigation
    const hasSeen = sessionStorage.getItem("sb_seen_weekly_report");
    if (!hasSeen) {
      sessionStorage.setItem("sb_seen_weekly_report", "true");
      return true;
    }
    return false;
  });

  // Compute state-specific recommended schemes
  const stateSchemes = schemes.filter(s => {
    const sName = s.name?.toLowerCase() || "";
    const pState = profile.state?.toLowerCase() || "";
    return sName.includes(pState) || pState.includes(sName);
  }).slice(0, 2);

  const fallbackSchemes = schemes.slice(0, 2);
  const recommendedSchemes = stateSchemes.length > 0 ? stateSchemes : fallbackSchemes;

  // Compute Readiness Score
  // Base score: complete profile info: 40 points
  // Vault document upload status: 60 points max (15 pts per uploaded/verified document, deductions for warning/missing)
  const calculateScore = () => {
    let score = 40; // Starts at 40 since onboarding is complete
    
    // Add points for uploaded documents
    const totalDocs = documents.length;
    if (totalDocs > 0) {
      const verifiedDocs = documents.filter(d => d.status === "Verified").length;
      const warningDocs = documents.filter(d => d.status === "Warning").length;
      // 15 pts for verified, 7 pts for warnings, 0 for missing
      score += (verifiedDocs * 15) + (warningDocs * 7);
    }

    // Add bonus points for tasks completed in Dashboard
    score += completedTasks.length * 5;

    return Math.min(100, score);
  };

  const score = calculateScore();

  // Get active tasks (uncompleted)
  const coreTasks = [
    { id: "task-digilocker", title: t("Sync with DigiLocker Account", lang), desc: t("Allows official digital document pulls", lang), duration: t("5 mins", lang) },
    { id: "task-panlink", title: t("Verify PAN-Aadhaar Integration", lang), desc: t("Ensures legal financial status", lang), duration: t("2 mins", lang) },
    { id: "task-voter", title: t("Check Voter List Registry", lang), desc: t("Verify registration for upcoming elections", lang), duration: t("10 mins", lang) },
    { id: "task-nominee", title: t("Register Nominee in Bank Savings", lang), desc: t("Secures your financial holdings", lang), duration: t("15 mins", lang) }
  ];

  const pendingDocs = documents.filter(d => d.status === "Missing" || d.status === "Warning").map(d => translateVaultDocument(d, lang));
  const activeComplaints = complaints.filter(c => c.trackingStatus !== "Resolved").map(c => translateGrievance(c, lang));

  // Get level and title based on score
  const getBadgeTitle = (val: number) => {
    if (val >= 90) return { title: t("Civic Adhikari (Elite Citizen)", lang), color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };
    if (val >= 75) return { title: t("Civic Pragati (Advanced Citizen)", lang), color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" };
    return { title: t("Civic Shishya (Active Learner)", lang), color: "text-amber-400 border-amber-500/30 bg-amber-500/10" };
  };

  const badgeObj = getBadgeTitle(score);

  return (
    <div className="space-y-6" id="dashboard-root">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-[#0e0721]/50 border border-violet-500/25 rounded-3xl relative overflow-hidden shadow-2xl shadow-violet-950/15" id="dashboard-welcome">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-[150px] h-[150px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10" id="dashboard-user-greeting">
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-violet-200 to-indigo-100 bg-clip-text text-transparent font-display flex items-center gap-2">
            {t("Namaste", lang)}, {profile.name}! <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
          </h2>
          <p className="text-violet-300/70 text-xs mt-1.5 font-sans">
            {t("Registered location:", lang)} <strong className="text-violet-200">{t(profile.city || "", lang)}, {t(profile.state || "", lang)}</strong> • {t("Profile Language:", lang)} <strong className="text-violet-200">{profile.preferredLanguage}</strong>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10" id="dashboard-badge-wrapper">
          <button
            onClick={() => setShowWeeklyReport(true)}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-2xl text-xs font-bold btn-premium-purple shadow-lg font-sans"
          >
            📊 {t("Weekly Report", lang)}
          </button>
          <span className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border border-violet-500/30 bg-violet-950/50 text-violet-300 font-sans shadow-lg`}>
            <Award className="w-4 h-4 text-violet-400" /> {badgeObj.title}
          </span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-grid">
        
        {/* Left Column: Readiness Gauge & Tasks */}
        <div className="lg:col-span-2 space-y-6" id="dashboard-left">
          
          {/* Bento Block 1: Readiness and Achievements */}
          <div className="bg-gradient-to-br from-[#120a2e]/60 to-[#080415]/80 border border-violet-500/20 rounded-[28px] p-6 relative overflow-hidden shadow-xl" id="dashboard-score-card">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-5 font-display">
              {t("Civic Readiness Index", lang)}
            </h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10" id="dashboard-score-flex">
              {/* Radial Gauge */}
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0" id="dashboard-radial-gauge">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    className="stroke-violet-950/60 fill-none"
                    strokeWidth="8"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    className="stroke-violet-500 transition-all duration-1000 ease-out fill-none"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - score / 100)}
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))" }}
                  />
                </svg>
                <div className="text-center z-10">
                  <span className="text-3xl font-black text-white tracking-tight font-display">{score}%</span>
                  <p className="text-[10px] text-violet-300 font-bold mt-1 tracking-wider uppercase font-sans">{t("Ready Score", lang)}</p>
                </div>
              </div>

              {/* Score breakdown metrics */}
              <div className="space-y-4 flex-1 w-full" id="dashboard-score-metrics">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{t("How to achieve 100%?", lang)}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                    {t("Your readiness meter evaluates profile strength, certified digital uploads, and active civic knowledge verification.", lang)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3.5" id="dashboard-quick-stats">
                  <div className="bg-violet-950/20 border border-violet-900/20 rounded-2xl p-3.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("Verified Proofs", lang)}</span>
                    <p className="text-lg font-extrabold text-emerald-400 mt-1 font-sans">
                      {documents.filter(d => d.status === "Verified").length} / {documents.length}
                    </p>
                  </div>
                  <div className="bg-violet-950/20 border border-violet-900/20 rounded-2xl p-3.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("Bonus Tasks", lang)}</span>
                    <p className="text-lg font-extrabold text-violet-400 mt-1 font-sans">
                      {completedTasks.length} / {coreTasks.length}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowWeeklyReport(true)}
                  className="w-full mt-1 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/45 text-violet-300 text-xs font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer font-sans"
                >
                  📊 {t("View AI Weekly Civic Report", lang)}
                </button>
              </div>
            </div>
          </div>

          {/* Bento Block 2: Upcoming Tasks */}
          <div className="bg-gradient-to-br from-[#120a2e]/60 to-[#080415]/80 border border-violet-500/20 rounded-[28px] p-6" id="dashboard-tasks">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-100 tracking-tight font-display">{t("Active Civic Challenges", lang)}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t("Complete tasks to increase your readiness index (+5 pts each)", lang)}</p>
              </div>
              <span className="text-xs font-bold bg-violet-950/50 border border-violet-900/30 px-3.5 py-1.5 rounded-xl text-violet-300 font-sans">
                {completedTasks.length} {t("completed", lang)}
              </span>
            </div>

            <div className="space-y-3.5" id="dashboard-task-list">
              {coreTasks.map(tsk => {
                const isDone = completedTasks.includes(tsk.id);
                return (
                  <div
                    key={tsk.id}
                    onClick={() => onToggleTask(tsk.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none font-sans ${
                      isDone
                        ? "bg-emerald-950/15 border-emerald-500/20 hover:bg-emerald-950/25"
                        : "bg-violet-950/10 border-violet-900/15 hover:border-violet-500/30 hover:bg-violet-950/20 hover:shadow-[0_0_15px_rgba(124,58,237,0.05)]"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`mt-0.5 rounded-md p-1 ${isDone ? "text-emerald-400" : "text-violet-400"}`}>
                        <CheckCircle className={`w-5 h-5 ${isDone ? "fill-emerald-500/10" : ""}`} />
                      </div>
                      <div>
                        <h4 className={`text-xs font-bold transition-colors duration-300 ${isDone ? "text-slate-500 line-through" : "text-slate-200"}`}>
                          {tsk.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">{tsk.desc}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 shrink-0 ml-2">
                      <Clock className="w-3.5 h-3.5" /> {tsk.duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bento Block 3: Quick Navigation actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="dashboard-quick-actions">
            <button
              onClick={() => onNavigate("companion")}
              className="bg-violet-900/10 border border-violet-500/20 hover:border-violet-500/55 p-4.5 rounded-2xl text-center hover:bg-violet-900/20 hover:shadow-[0_0_15px_rgba(124,58,237,0.15)] cursor-pointer transition-all duration-300 group"
            >
              <Send className="w-5 h-5 text-violet-400 mx-auto mb-2 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span className="text-xs font-bold text-violet-200">{t("Life Plan AI", lang)}</span>
            </button>

            <button
              onClick={() => onNavigate("vault")}
              className="bg-emerald-900/10 border border-emerald-500/20 hover:border-emerald-500/55 p-4.5 rounded-2xl text-center hover:bg-emerald-900/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer transition-all duration-300 group"
            >
              <FileWarning className="w-5 h-5 text-emerald-400 mx-auto mb-2 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xs font-bold text-emerald-200">{t("Doc Vault", lang)}</span>
            </button>

            <button
              onClick={() => onNavigate("schemes")}
              className="bg-amber-900/10 border border-amber-500/20 hover:border-amber-500/55 p-4.5 rounded-2xl text-center hover:bg-amber-900/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] cursor-pointer transition-all duration-300 group"
            >
              <Zap className="w-5 h-5 text-amber-400 mx-auto mb-2 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xs font-bold text-amber-200">{t("View Schemes", lang)}</span>
            </button>

            <button
              onClick={() => onNavigate("complaints")}
              className="bg-rose-900/10 border border-rose-500/20 hover:border-rose-500/55 p-4.5 rounded-2xl text-center hover:bg-rose-900/20 hover:shadow-[0_0_15px_rgba(244,63,94,0.15)] cursor-pointer transition-all duration-300 group"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 mx-auto mb-2 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-xs font-bold text-rose-200">{t("Report Issue", lang)}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Schemes, Vault Issues & Complaint Trackers */}
        <div className="space-y-6" id="dashboard-right-bento">
          
          {/* Bento Block 4: Critical Vault Notices */}
          <div className="bg-gradient-to-br from-[#120a2e]/60 to-[#080415]/80 border border-violet-500/20 rounded-[28px] p-6" id="dashboard-vault-notices">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest font-display">{t("Vault Integrity", lang)}</h3>
              <button onClick={() => onNavigate("vault")} className="text-[10px] text-violet-400 font-bold flex items-center gap-0.5 hover:underline cursor-pointer font-sans">
                {t("Manage", lang)} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingDocs.length === 0 ? (
              <div className="text-center py-7 bg-violet-950/10 border border-violet-900/10 rounded-2xl" id="dashboard-vault-empty">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2.5" />
                <p className="text-xs font-bold text-slate-200">{t("Vault fully compliant!", lang)}</p>
                <p className="text-[10px] text-slate-400 mt-1">{t("All essential ID documents are verified", lang)}</p>
              </div>
            ) : (
              <div className="space-y-3.5" id="dashboard-vault-notices-list">
                {pendingDocs.map(doc => (
                  <div key={doc.id} className="p-3.5 bg-violet-950/15 border border-violet-900/20 rounded-2xl flex gap-3 font-sans hover:border-violet-500/20 transition-all duration-300">
                    <div className={`mt-0.5 shrink-0 ${doc.status === "Missing" ? "text-rose-400" : "text-amber-400"}`}>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-200">{doc.name}</span>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase ${
                          doc.status === "Missing" ? "bg-rose-950/40 text-rose-400 border border-rose-500/15" : "bg-amber-950/40 text-amber-400 border border-amber-500/15"
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                        {doc.status === "Missing" ? t("Document is required for matching several state subsidies.", lang) : doc.criticalIssues?.[0]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bento Block 5: Active Grievance Tracker */}
          <div className="bg-gradient-to-br from-[#120a2e]/60 to-[#080415]/80 border border-violet-500/20 rounded-[28px] p-6" id="dashboard-complaints-notices">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest font-display">{t("Grievance Activity", lang)}</h3>
              <button onClick={() => onNavigate("complaints")} className="text-[10px] text-violet-400 font-bold flex items-center gap-0.5 hover:underline cursor-pointer font-sans">
                {t("Trackers", lang)} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {complaints.length === 0 ? (
              <div className="text-center py-7 bg-violet-950/10 border border-violet-900/10 rounded-2xl" id="dashboard-complaints-empty">
                <CheckCircle className="w-10 h-10 text-slate-500 mx-auto mb-2.5" />
                <p className="text-xs font-bold text-slate-400">{t("No active complaints filed", lang)}</p>
                <p className="text-[10px] text-slate-400 mt-1">{t("Use the AI complaint tool to report hazards", lang)}</p>
              </div>
            ) : (
              <div className="space-y-3.5" id="dashboard-complaint-feed">
                {complaints.slice(0, 2).map(comp => {
                  const gc = translateGrievance(comp, lang);
                  return (
                    <div key={comp.id} className="p-3.5 bg-violet-950/15 border border-violet-900/20 rounded-2xl font-sans hover:border-violet-500/20 transition-all duration-300">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-violet-400 bg-violet-950/40 px-2 py-0.5 rounded-lg border border-violet-900/20">{gc.trackingId}</span>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase border ${
                          gc.trackingStatus === "Resolved"
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/15"
                            : gc.trackingStatus === "Processing"
                            ? "bg-amber-950/40 text-amber-400 border-amber-500/15"
                            : "bg-blue-950/40 text-blue-400 border-blue-500/15"
                        }`}>
                          {t(gc.trackingStatus || "", lang)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 mt-2.5 truncate">{gc.suggestedTitle}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{gc.location}</p>
                      
                      {/* Tiny visual progress bar */}
                      <div className="h-[3px] bg-violet-950 rounded-full mt-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${gc.trackingStatus === "Resolved" ? "bg-emerald-400" : "bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse"}`}
                          style={{
                            width: gc.trackingStatus === "Resolved" ? "100%" : gc.trackingStatus === "Processing" ? "70%" : gc.trackingStatus === "Assigned" ? "40%" : "15%"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bento Block 6: Next Calendar Event Highlight */}
          <div className="bg-gradient-to-br from-violet-950/30 to-[#120a2e]/60 border border-violet-500/20 rounded-[28px] p-6 relative overflow-hidden" id="dashboard-calendar-card">
            <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-4 font-display">
              {t("Next Civic Deadline", lang)}
            </h3>
            {calendarEvents.slice(0, 1).map(ev => {
              const translatedEv = translateCalendarEvent(ev, lang);
              const dParts = ev.date.split("-");
              const formattedDate = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
              return (
                <div key={ev.id} className="space-y-3.5 relative z-10" id="dashboard-next-deadline">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent font-display">{formattedDate}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2.5 py-0.5 rounded-lg">
                      {translatedEv.category}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{translatedEv.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-normal mt-1">{translatedEv.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* AI Weekly Civic Report Modal */}
      {showWeeklyReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans" id="weekly-report-modal">
          <div className="bg-[#100924]/95 border border-violet-500/20 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-violet-500/10 flex justify-between items-center bg-gradient-to-r from-[#170e30] to-[#0a0518] relative">
              <div className="absolute top-0 left-0 w-1/3 h-full bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider font-sans">
                  ✨ {t("AI Citizen Intelligence", lang)}
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight mt-2.5 flex items-center gap-2 font-display">
                  📊 {t("Weekly Civic Report & Readiness", lang)}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {t("Personalized summary of your civic identity, schemes & pending status.", lang)}
                </p>
              </div>
              <button
                onClick={() => setShowWeeklyReport(false)}
                className="text-slate-400 hover:text-white bg-violet-950/40 border border-violet-900/30 p-2 rounded-xl transition cursor-pointer relative z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-violet-950/10">
              
              {/* Readiness Score Box */}
              <div className="bg-[#170e33]/70 border border-violet-500/15 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="34" className="stroke-violet-950/60 fill-none" strokeWidth="5" />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      className="stroke-emerald-400 fill-none transition-all duration-1000"
                      strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={2 * Math.PI * 34 * (1 - score / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-lg font-black text-white font-sans">{score}%</span>
                </div>
                
                <div className="text-center sm:text-left space-y-1 relative z-10">
                  <span className="text-[10px] font-bold text-violet-400 block uppercase tracking-wider">{t("Current Citizen Status", lang)}</span>
                  <h3 className="text-sm font-bold text-emerald-400 font-sans">{badgeObj.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {score >= 90 
                      ? t("Outstanding! Your documentation and profile match perfectly. You are fully ready for automatic scheme approvals.", lang)
                      : t("We found some missing documents and uncompleted tasks that are keeping you from full benefits eligibility.", lang)}
                  </p>
                </div>
              </div>

              {/* Two columns: Document & Tasks status, and Complaint status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Documents & Checklist Status */}
                <div className="bg-[#150e2d]/50 border border-violet-500/15 p-4 rounded-2xl space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> {t("Documents & Tasks", lang)}
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs bg-violet-950/30 px-3 py-2.5 rounded-xl border border-violet-900/10">
                      <span className="text-slate-400 font-medium">{t("Verified Documents", lang)}</span>
                      <span className="font-extrabold text-emerald-400 font-sans">
                        {documents.filter(d => d.status === "Verified").length} / {documents.length}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs bg-violet-950/30 px-3 py-2.5 rounded-xl border border-violet-900/10">
                      <span className="text-slate-400 font-medium">{t("Completed Profile Tasks", lang)}</span>
                      <span className="font-extrabold text-violet-400 font-sans">
                        {completedTasks.length} / {coreTasks.length}
                      </span>
                    </div>

                    {pendingDocs.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{t("Attention Required", lang)}</span>
                        <div className="space-y-1.5 flex flex-wrap gap-1.5">
                          {pendingDocs.slice(0, 2).map((d, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2.5 py-1 rounded-lg font-bold">
                              ⚠️ {d.name} ({t(d.status || "", lang)})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Complaint Status */}
                <div className="bg-[#150e2d]/50 border border-violet-500/15 p-4 rounded-2xl space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-violet-400" /> {t("Complaint Status Updates", lang)}
                  </h4>

                  {complaints.length > 0 ? (
                    <div className="space-y-2">
                      {complaints.slice(0, 2).map(comp => {
                        const gc = translateGrievance(comp, lang);
                        return (
                          <div key={comp.id} className="p-2.5 bg-violet-950/30 border border-violet-900/10 rounded-xl flex items-center justify-between text-xs font-sans">
                            <div className="truncate pr-2">
                              <p className="font-bold text-slate-200 truncate">{gc.suggestedTitle}</p>
                              <p className="text-[9px] text-slate-500 mt-0.5 truncate">{gc.trackingId}</p>
                            </div>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                              gc.trackingStatus === "Resolved"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/15"
                                : "bg-violet-950 text-violet-400 border border-violet-500/15"
                            }`}>
                              {t(gc.trackingStatus || "", lang)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[100px] flex flex-col items-center justify-center text-center p-3 bg-violet-950/10 rounded-xl border border-dashed border-violet-900/20">
                      <p className="text-[11px] text-slate-400 italic">{t("No active grievances reported.", lang)}</p>
                    </div>
                  )}
                </div>

              </div>

              {/* State-Specific Schemes Recommended */}
              <div className="bg-[#150e2d]/50 border border-violet-500/15 p-5 rounded-2xl space-y-3.5">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-400" /> {t("Fresh Recommended Welfare Schemes", lang)}
                </h4>
                <p className="text-[11px] text-slate-400 -mt-1 font-sans">
                  {t("Recommended benefit policies active in your state of residence:", lang)} <strong className="text-violet-300">{t(profile.state || "", lang)}</strong>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {recommendedSchemes.map(s => (
                    <div key={s.id} className="p-3.5 bg-violet-950/20 border border-violet-900/15 rounded-xl flex flex-col justify-between font-sans">
                      <div>
                        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider block bg-violet-500/10 px-2 py-0.5 rounded-lg border border-violet-500/10 w-max mb-1.5">
                          🏛️ {t(s.category, lang)}
                        </span>
                        <h5 className="text-xs font-bold text-slate-200 line-clamp-1">{t(s.name, lang)}</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1 line-clamp-2">{t(s.benefits, lang)}</p>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-violet-900/10 text-[10px]">
                        <span className="text-emerald-400 font-bold">{t(s.estimatedApprovalTime, lang)}</span>
                        <button
                          onClick={() => {
                            setShowWeeklyReport(false);
                            onNavigate("schemes");
                          }}
                          className="text-violet-400 font-bold hover:underline cursor-pointer bg-transparent border-none p-0 font-sans"
                        >
                          {t("Compare", lang)} →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advisor Note */}
              <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
                <h5 className="text-xs font-bold text-violet-400 uppercase tracking-wider font-sans mb-1 flex items-center gap-1.5">
                  💡 {t("Weekly Advisor Insight", lang)}
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {score < 90
                    ? `${t("To lock in full benefits protection under Indian State & Central Schemes, upload your missing", lang)} Aadhaar / Voter ID ${t("proof inside the secure Document Vault. This allows the AI to automatically file verified, error-free applications on your behalf.", lang)}`
                    : t("Superb! You are fully protected. Your credentials are fully integrated with DigiLocker. Keep a copy of your Driving Licence in your vault for next week's automobile registration scheme release.", lang)}
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-violet-500/10 bg-[#0c061d] flex justify-end">
              <button
                onClick={() => setShowWeeklyReport(false)}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition cursor-pointer font-sans"
              >
                {t("Acknowledge", lang)}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


import React, { useState, useEffect } from "react";
import { CitizenProfile, ActionPlan, VaultDocument, CivicGrievance, CivicNotification } from "./types";
import { t } from "./translations";
import {
  INITIAL_VAULT_DOCUMENTS,
  MOCK_CALENDAR_EVENTS,
  DEFAULT_SCHEMES,
  MOCK_COMPLAINTS,
  INITIAL_NOTIFICATIONS
} from "./data";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import AICompanion from "./components/AICompanion";
import DocumentVault from "./components/DocumentVault";
import SchemeWelfare from "./components/SchemeWelfare";
import ComplaintCenter from "./components/ComplaintCenter";
import ProfileView from "./components/ProfileView";

import {
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Award,
  AlertCircle,
  User,
  Bell,
  Sun,
  Moon,
  Accessibility,
  Languages,
  CheckCircle2,
  Calendar,
  Volume2,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // 1. Splash Screen active state
  const [showSplash, setShowSplash] = useState(true);

  // 2. Global Core states (persisted via localStorage)
  const [profile, setProfile] = useState<CitizenProfile>(() => {
    const saved = localStorage.getItem("sb_profile");
    if (saved) return JSON.parse(saved);
    return {
      name: "",
      age: 0,
      gender: "",
      state: "",
      city: "",
      occupation: "",
      income: "",
      isStudent: false,
      isBusinessOwner: false,
      isFarmer: false,
      isSeniorCitizen: false,
      preferredLanguage: "English",
      hasOnboarded: false
    };
  });

  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const [currentPlan, setCurrentPlan] = useState<ActionPlan | null>(() => {
    const saved = localStorage.getItem("sb_active_plan");
    return saved ? JSON.parse(saved) : null;
  });

  const [documents, setDocuments] = useState<VaultDocument[]>(() => {
    const saved = localStorage.getItem("sb_vault_documents");
    return saved ? JSON.parse(saved) : INITIAL_VAULT_DOCUMENTS;
  });

  const [complaints, setComplaints] = useState<CivicGrievance[]>(() => {
    const saved = localStorage.getItem("sb_grievances");
    return saved ? JSON.parse(saved) : MOCK_COMPLAINTS;
  });

  const [completedTasks, setCompletedTasks] = useState<string[]>(() => {
    const saved = localStorage.getItem("sb_completed_tasks");
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<CivicNotification[]>(() => {
    const saved = localStorage.getItem("sb_notifications");
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // 3. Theme & Accessibility States
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [speechReader, setSpeechReader] = useState(false);

  // Notifications dropdown open state
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Synced local storage effects
  useEffect(() => {
    localStorage.setItem("sb_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("sb_active_plan", JSON.stringify(currentPlan));
  }, [currentPlan]);

  useEffect(() => {
    localStorage.setItem("sb_vault_documents", JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem("sb_grievances", JSON.stringify(complaints));
  }, [complaints]);

  useEffect(() => {
    localStorage.setItem("sb_completed_tasks", JSON.stringify(completedTasks));
  }, [completedTasks]);

  useEffect(() => {
    localStorage.setItem("sb_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Handle auto task completion and tracking when a document is uploaded/audited
  useEffect(() => {
    (window as any).onDocumentUploaded = (docType: string) => {
      let matchedTaskId = "";
      let taskName = "";
      
      const lang = profile.preferredLanguage || "English";
      if (docType.includes("PAN")) {
        matchedTaskId = "task-panlink";
        taskName = t("Verify PAN-Aadhaar Integration", lang);
      } else if (docType.includes("Aadhaar")) {
        matchedTaskId = "task-digilocker";
        taskName = t("Sync with DigiLocker Account", lang);
      } else if (docType.includes("Voter")) {
        matchedTaskId = "task-voter";
        taskName = t("Check Voter List Registry", lang);
      }

      if (matchedTaskId) {
        setCompletedTasks(prev => {
          if (!prev.includes(matchedTaskId)) {
            // Trigger a beautiful system notification!
            handleAddNotification(
              t("Task Automatically Completed!", lang),
              `${t("AI updated your profile & completed task", lang)} "${taskName}".`,
              "system"
            );
            return [...prev, matchedTaskId];
          }
          return prev;
        });
      }
    };

    return () => {
      delete (window as any).onDocumentUploaded;
    };
  }, [profile.preferredLanguage]);

  // Screen speech narration triggered on tab changes if accessibility speech active
  useEffect(() => {
    if (speechReader && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // cancel existing narration
      const utterances: Record<string, string> = {
        dashboard: `Navigating to Smart Bharat Dashboard. Your readiness score is ${calculateScore()} percent.`,
        companion: `AI Companion loaded. What occurred in your life today? Select any card or enter custom goals.`,
        vault: `Secure Document Vault active. Review your verified, expiring soon, or missing certifications.`,
        schemes: `Welfare benefits active. Browse eligible programs customized to your profile.`,
        complaints: `Grievance filing cell active. Upload photo proof to file a complaint ticket.`,
        profile: `Civic Profile configuration open.`
      };
      const textToSpeak = utterances[activeTab] || "";
      if (textToSpeak) {
        const u = new SpeechSynthesisUtterance(textToSpeak);
        u.lang = "en-IN";
        u.rate = 1.0;
        window.speechSynthesis.speak(u);
      }
    }
  }, [activeTab, speechReader]);

  const calculateScore = () => {
    let score = 40; // Base score for completing onboarding
    const verifiedDocs = documents.filter(d => d.status === "Verified").length;
    const warningDocs = documents.filter(d => d.status === "Warning").length;
    score += (verifiedDocs * 15) + (warningDocs * 7);
    score += completedTasks.length * 5;
    return Math.min(100, score);
  };

  const currentScore = calculateScore();

  // Handle adding notifications dynamically
  const handleAddNotification = (title: string, body: string, category: 'scheme' | 'document' | 'complaint' | 'system') => {
    const newNotif: CivicNotification = {
      id: "notif-" + Date.now(),
      title,
      body,
      category,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleMarkNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleToggleTask = (taskId: string) => {
    setCompletedTasks(prev => {
      const isDone = prev.includes(taskId);
      if (isDone) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const triggerLogout = () => {
    setShowLogoutConfirm(true);
  };

  const executeLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setProfile({
      name: "",
      age: 0,
      gender: "",
      state: "",
      city: "",
      occupation: "",
      income: "",
      isStudent: false,
      isBusinessOwner: false,
      isFarmer: false,
      isSeniorCitizen: false,
      preferredLanguage: "English",
      hasOnboarded: false
    });
    setCurrentPlan(null);
    setDocuments(INITIAL_VAULT_DOCUMENTS);
    setComplaints(MOCK_COMPLAINTS);
    setCompletedTasks([]);
    setNotifications(INITIAL_NOTIFICATIONS);
    setActiveTab("dashboard");
    setShowLogoutConfirm(false);
    setShowSplash(true);
  };

  // Class modifier for Theme and Accessibility Toggles
  const getAccessibilityClasses = () => {
    let cls = "";
    if (highContrast) cls += " bg-black text-yellow-300 border-yellow-400 contrast-125";
    else if (isDarkMode) cls += " bg-elegant-bg text-elegant-text";
    else cls += " bg-slate-50 text-slate-900";

    if (largeText) cls += " text-lg leading-relaxed";
    return cls;
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "companion", label: "AI Companion", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "vault", label: "Document Vault", icon: <FileText className="w-4 h-4" /> },
    { id: "schemes", label: "Welfare Schemes", icon: <Award className="w-4 h-4" /> },
    { id: "complaints", label: "Grievance Center", icon: <AlertCircle className="w-4 h-4" /> },
    { id: "profile", label: "My Profile", icon: <User className="w-4 h-4" /> }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${getAccessibilityClasses()}`} id="app-wrapper">
      
      {/* 1. Splash Screen Mode */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-[#07030d] flex flex-col justify-center items-center z-[100] px-4 overflow-hidden"
            id="splash-screen"
          >
            {/* Ambient visual background glow mesh */}
            <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[130px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[15%] right-[10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-[40%] left-[45%] w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[110px] pointer-events-none" />

            <div className="text-center max-w-lg relative z-10 space-y-8 bg-black/40 border border-violet-500/10 p-10 rounded-[32px] backdrop-blur-2xl shadow-2xl shadow-violet-950/20" id="splash-card">
              
              {/* Emblem Logo */}
              <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-violet-600/15 to-indigo-600/5 border border-violet-500/35 rounded-[32px] shadow-[0_0_50px_rgba(124,58,237,0.15)] relative mb-2" id="splash-emblem">
                <Sparkles className="w-14 h-14 text-violet-400 animate-pulse" />
                <div className="absolute inset-0 border border-violet-500/40 rounded-[32px] animate-ping opacity-15" />
              </div>

              <div className="space-y-3">
                <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent font-display">
                  Smart Bharat
                </h1>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-300 font-display">
                  Your AI Civic Companion
                </p>
                <p className="text-xs text-slate-400 leading-relaxed px-4 font-sans">
                  Navigating Indian government roadmaps, welfare schemes, identity verification, and municipal grievances with state-of-the-art AI.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setShowSplash(false)}
                  className="btn-premium-purple font-extrabold px-10 py-4 text-xs rounded-2xl cursor-pointer tracking-wider uppercase font-display"
                >
                  Enter Experience
                </button>
              </div>

              <div className="flex justify-center gap-6 text-[10px] text-slate-500 pt-6 border-t border-violet-500/10" id="splash-footer">
                <span className="tracking-wider">DIGITAL INDIA • 2026</span>
                <span className="tracking-wider">SECURE CRYPTO STORAGE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Onboarding Mode (Only if splash is dismissed and profile is empty) */}
      {!showSplash && !profile.hasOnboarded && (
        <Onboarding
          initialProfile={profile}
          onComplete={(onboardedProf) => setProfile(onboardedProf)}
        />
      )}

      {/* 3. Main Dashboard Workspace Core */}
      {!showSplash && profile.hasOnboarded && (
        <div className="flex h-screen overflow-hidden bg-[#07030d]" id="dashboard-workspace">
          
          {/* Static Vertical Rail Navigation */}
          <aside className={`w-64 border-r hidden md:flex flex-col justify-between shrink-0 ${
            highContrast ? "border-yellow-400 bg-black" : "border-violet-950/20 bg-gradient-to-b from-[#100826] to-[#080415] backdrop-blur-2xl"
          }`} id="sidebar-rail">
            <div className="p-6 space-y-8">
              {/* Sidebar Logo */}
              <div className="flex items-center gap-3" id="sidebar-brand">
                <div className="p-2.5 bg-violet-600/10 border border-violet-500/20 rounded-xl text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight leading-none bg-gradient-to-r from-violet-200 to-indigo-200 bg-clip-text text-transparent font-display">Smart Bharat</h1>
                  <span className="text-[9px] text-violet-400 font-bold block mt-1 tracking-wider uppercase font-display">AI CIVIC COMPANION</span>
                </div>
              </div>

              {/* Sidebar Tabs list */}
              <nav className="space-y-2" id="sidebar-tabs">
                {navItems.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowNotifDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer select-none font-display relative overflow-hidden group ${
                        isActive
                          ? highContrast
                            ? "bg-yellow-400 text-black border border-yellow-400"
                            : "bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-500 text-white shadow-lg shadow-violet-600/25 border border-violet-500/30"
                          : "text-slate-400 hover:text-white hover:bg-violet-950/30 border border-transparent hover:border-violet-950/20"
                      }`}
                    >
                      <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white" : "text-violet-400 group-hover:text-violet-300"}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      
                      {isActive && (
                        <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-pink-400 to-violet-400 rounded-l-full" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Accessibility & Logout short cuts on bottom */}
            <div className="p-6 border-t border-violet-950/20 space-y-4" id="sidebar-footer">
              <div className="flex justify-between items-center bg-violet-950/20 p-2.5 border border-violet-900/20 rounded-2xl">
                <span className="text-[10px] text-violet-300 font-bold font-display tracking-wide">Speech Assistant</span>
                <button
                  onClick={() => setSpeechReader(prev => !prev)}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    speechReader ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/10" : "bg-violet-950/40 border-violet-900/30 text-violet-400"
                  }`}
                  title="Toggle Screen Speech Synthesis"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-violet-950/10 pt-4" id="sidebar-mini-profile">
                <div className="flex items-center gap-2.5 truncate flex-1">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 border border-violet-400/20 flex items-center justify-center text-xs text-white font-black shrink-0 shadow-lg shadow-violet-600/15">
                    {profile.name ? profile.name.charAt(0) : "C"}
                  </div>
                  <div className="truncate">
                    <h4 className="text-[11px] font-black text-slate-100 leading-none font-sans truncate">{profile.name}</h4>
                    <span className="text-[9px] text-violet-400 font-semibold block truncate mt-1.5 font-sans">{profile.city}</span>
                  </div>
                </div>
                <button
                  onClick={triggerLogout}
                  className="p-2 rounded-xl border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/15 text-rose-400 transition cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>

          {/* Core scrollable content canvas */}
          <div className="flex-1 flex flex-col min-w-0" id="content-canvas">
            
            {/* Header control board */}
            <header className={`border-b h-16 flex items-center justify-between px-6 shrink-0 relative ${
              highContrast ? "border-yellow-400 bg-black" : "border-violet-950/20 bg-[#0e0821]/40 backdrop-blur-md"
            }`} id="header-control">
              
              {/* Readiness bar at the absolute top of the header */}
              <div className="absolute top-0 left-0 h-[3px] bg-violet-950 w-full overflow-hidden" id="header-progress-track">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 via-pink-500 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${currentScore}%` }}
                />
              </div>

              {/* Title tab context */}
              <div className="flex items-center gap-3" id="header-title">
                {/* Mobile Burger Menu or App brand */}
                <span className="md:hidden p-2.5 bg-violet-950/40 border border-violet-900/30 rounded-xl text-violet-400">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-100 capitalize leading-none tracking-tight font-display">
                    {activeTab === "complaints" ? "Grievance Center" : activeTab === "schemes" ? "Welfare Schemes" : `${activeTab}`}
                  </h3>
                  <span className="text-[9px] text-violet-400 font-bold block mt-1.5 hidden sm:block font-sans tracking-wide">
                    {activeTab === "dashboard" && "Bento insights, metrics and upcoming milestones"}
                    {activeTab === "companion" && "AI procedural advisor and visual action sequences"}
                    {activeTab === "vault" && "Secure certified files check & OCR audit scanner"}
                    {activeTab === "schemes" && "Eligibility matching algorithm across central grants"}
                    {activeTab === "complaints" && "Visual GPS- grievance recorder & automatic draft submissions"}
                    {activeTab === "profile" && "Manage localized demographic fields & assistive tools"}
                  </span>
                </div>
              </div>

              {/* Header Right togglers */}
              <div className="flex items-center gap-3" id="header-actions">
                
                {/* Score badge indicator */}
                <div className="bg-violet-950/30 border border-violet-900/30 px-3.5 py-2 rounded-2xl flex items-center gap-2 cursor-pointer hover:border-violet-500/30 transition-all duration-300" onClick={() => setActiveTab("profile")}>
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                  <span className="text-[10px] text-violet-300 font-bold font-sans">Ready Score:</span>
                  <span className="text-xs font-bold text-violet-400 font-sans">{currentScore}%</span>
                </div>

                {/* Dark/Light mode toggle */}
                <button
                  type="button"
                  onClick={() => setIsDarkMode(prev => !prev)}
                  className="p-2 rounded-xl border border-violet-900/30 text-violet-400 hover:text-white hover:bg-violet-950/40 cursor-pointer transition-all duration-300"
                  title="Toggle Light/Dark Theme"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Secure Logout Shortcut (Always Accessible) */}
                <button
                  type="button"
                  onClick={triggerLogout}
                  className="p-2 rounded-xl border border-rose-500/25 hover:border-rose-500 hover:bg-rose-500/10 text-rose-400 cursor-pointer transition-all duration-300"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Notification Dropdown icon */}
                <div className="relative" id="header-notification-bell">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifDropdown(prev => !prev);
                      handleMarkNotificationsRead();
                    }}
                    className="p-2 rounded-xl border border-violet-900/30 text-violet-400 hover:text-white hover:bg-violet-950/40 cursor-pointer transition-all duration-300 relative"
                    title="Reminders"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.some(n => !n.isRead) && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                    )}
                  </button>

                  {/* Notification Dropdown Board */}
                  <AnimatePresence>
                    {showNotifDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-3 w-80 bg-[#120a28]/95 border border-violet-500/20 rounded-3xl p-5 shadow-2xl z-50 space-y-4 backdrop-blur-2xl"
                      >
                        <div className="flex justify-between items-center border-b border-violet-500/10 pb-2">
                          <h4 className="text-xs font-bold text-white font-display">Notifications</h4>
                          <span className="text-[9px] text-violet-400 font-bold font-sans">{notifications.length} alerts</span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto" id="notification-alerts-feed">
                          {notifications.length === 0 ? (
                            <p className="text-[10px] text-slate-500 text-center py-4 font-sans">No notifications yet.</p>
                          ) : (
                            notifications.map(notif => (
                              <div key={notif.id} className="p-3 bg-violet-950/30 border border-violet-900/20 rounded-2xl space-y-1">
                                <div className="flex justify-between items-start gap-1">
                                  <h5 className="text-[11px] font-bold text-slate-200 truncate font-sans">{notif.title}</h5>
                                  <span className={`text-[8px] px-1.5 py-0.2 rounded-full uppercase font-bold shrink-0 font-mono ${
                                    notif.category === "scheme" ? "bg-amber-950 text-amber-400" : notif.category === "document" ? "bg-emerald-950 text-emerald-400" : "bg-violet-600/15 text-violet-400"
                                  }`}>
                                    {notif.category}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-400 leading-normal font-sans">{notif.body}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </header>

            {/* Mobile Bottom Navigation Bar (ONLY visible on mobile screens) */}
            <nav className={`md:hidden h-14 border-t flex items-center justify-around fixed bottom-0 left-0 w-full z-40 px-2 ${
              highContrast ? "border-yellow-400 bg-black" : "border-violet-950/20 bg-[#0f0a22]/90 backdrop-blur-xl"
            }`} id="mobile-navigation-bar">
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowNotifDropdown(false);
                    }}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                      isActive ? "text-violet-400 bg-violet-600/10" : "text-slate-500"
                    }`}
                  >
                    {item.icon}
                    <span className="text-[8px] font-bold mt-1 leading-none">{item.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </nav>

            {/* Main screen panels frame with beautiful route transition animations */}
            <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6 relative" id="main-panel-frame">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {activeTab === "dashboard" && (
                    <Dashboard
                      profile={profile}
                      documents={documents}
                      complaints={complaints}
                      schemes={DEFAULT_SCHEMES}
                      calendarEvents={MOCK_CALENDAR_EVENTS}
                      onNavigate={setActiveTab}
                      completedTasks={completedTasks}
                      onToggleTask={handleToggleTask}
                      onAddTaskScore={() => {}}
                    />
                  )}

                  {activeTab === "companion" && (
                    <AICompanion
                      profile={profile}
                      currentPlan={currentPlan}
                      onPlanGenerated={setCurrentPlan}
                      onAddNotification={handleAddNotification}
                      documents={documents}
                    />
                  )}

                  {activeTab === "vault" && (
                    <DocumentVault
                      profile={profile}
                      documents={documents}
                      onUpdateDocuments={setDocuments}
                      onAddNotification={handleAddNotification}
                    />
                  )}

                  {activeTab === "schemes" && (
                    <SchemeWelfare
                      profile={profile}
                      recommendedSchemes={DEFAULT_SCHEMES}
                      onAddNotification={handleAddNotification}
                    />
                  )}

                  {activeTab === "complaints" && (
                    <ComplaintCenter
                      profile={profile}
                      complaints={complaints}
                      onUpdateComplaints={setComplaints}
                      onAddNotification={handleAddNotification}
                    />
                  )}

                  {activeTab === "profile" && (
                    <ProfileView
                      profile={profile}
                      documents={documents}
                      onUpdateProfile={setProfile}
                      onLogout={triggerLogout}
                      onToggleHighContrast={() => setHighContrast(p => !p)}
                      highContrast={highContrast}
                      onToggleLargeText={() => setLargeText(p => !p)}
                      largeText={largeText}
                      onToggleSpeechReader={() => setSpeechReader(p => !p)}
                      speechReader={speechReader}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog for Logout */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] px-4" id="logout-confirm-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-elegant-card border border-elegant-border rounded-3xl p-6 max-w-sm w-full space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-950/40 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-display">Confirm Logout</h4>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider font-sans">Reset Application</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Are you sure you want to log out of Smart Bharat? This will securely clear all your personal identity profiles, document summaries, and grievance trackers from this browser's secure cache.
              </p>

              <div className="flex gap-3 pt-2 font-sans">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-elegant-bg border border-elegant-border hover:border-slate-500 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeLogout}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-rose-900/20"
                >
                  Logout & Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

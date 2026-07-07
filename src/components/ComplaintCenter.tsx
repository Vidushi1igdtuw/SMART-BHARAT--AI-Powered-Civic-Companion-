import React, { useState, useRef } from "react";
import { CitizenProfile, CivicGrievance } from "../types";
import { UploadCloud, CheckCircle, AlertCircle, Sparkles, MapPin, Landmark, ShieldAlert, FileText, Send, Loader2, ArrowRight, Check, Play, Circle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../translations";

interface ComplaintCenterProps {
  profile: CitizenProfile;
  complaints: CivicGrievance[];
  onUpdateComplaints: (complaints: CivicGrievance[]) => void;
  onAddNotification: (title: string, body: string, cat: 'scheme' | 'document' | 'complaint' | 'system') => void;
}

const CATEGORIES = [
  { id: "garbage", label: "Garbage Pile-up", icon: "🗑️" },
  { id: "pothole", label: "Pothole", icon: "🕳️" },
  { id: "street_light", label: "Street Light Defect", icon: "💡" },
  { id: "water_leakage", label: "Water Leakage", icon: "🚰" },
  { id: "broken_road", label: "Broken Road / Footpath", icon: "🚧" }
];

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Compress using low quality to reduce size to ~50-100KB
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressedBase64);
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function ComplaintCenter({
  profile,
  complaints,
  onUpdateComplaints,
  onAddNotification
}: ComplaintCenterProps) {
  const [selectedCategory, setSelectedCategory] = useState("pothole");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(`Ward 12, near Civic Circle, ${profile.city}`);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lang = profile.preferredLanguage || "English";

  // Cache repeated complaint analyses
  const complaintCacheRef = useRef<Record<string, any>>({});

  const selectedComplaint = complaints.find(c => c.id === activeComplaintId);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const rawBase64 = reader.result as string;
        // Show image preview immediately after upload
        setBase64Image(rawBase64);
        
        // Compress in background
        try {
          const compressed = await compressImage(rawBase64);
          setBase64Image(compressed);
        } catch (err) {
          console.error("Compression error:", err);
        }
      };
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRegisterComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Image preparation state
      setLoadingStep(t("Compressing & optimizing captured image...", lang));
      await new Promise(r => setTimeout(r, 600));

      let processedImage = base64Image;
      if (base64Image && !base64Image.startsWith("data:image/jpeg;base64,compressed")) {
        processedImage = await compressImage(base64Image);
      }

      const cacheKey = `${selectedCategory}_${description.trim()}_${processedImage ? processedImage.length : 0}`;
      let data;

      // Check cache for instant load
      if (complaintCacheRef.current[cacheKey]) {
        setLoadingStep(t("Retrieving cached AI analysis...", lang));
        await new Promise(r => setTimeout(r, 500));
        data = complaintCacheRef.current[cacheKey];
      } else {
        // Step 2: Contacting Gemini
        setLoadingStep(t("Analyzing image features & detecting civic hazard...", lang));
        
        const res = await fetch("/api/gemini/generate-complaint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: selectedCategory,
            description: description || "Reported via Smart Bharat Citizen Grievance Portal.",
            location,
            base64Image: processedImage,
            profile
          })
        });

        if (!res.ok) {
          throw new Error("Failed to contact grievance analyzer");
        }

        data = await res.json();
        // Save response to cache
        complaintCacheRef.current[cacheKey] = data;
      }

      // Step 3: Drafting bilingual complaint
      setLoadingStep(t("Drafting bilingual administrative complaint...", lang));
      await new Promise(r => setTimeout(r, 600));

      // Step 4: Registering and routing
      setLoadingStep(t("Registering tracking ID & calculating SLA SLAs...", lang));
      await new Promise(r => setTimeout(r, 500));

      const newComplaint: CivicGrievance = {
        id: "comp-" + Date.now(),
        trackingId: data.trackingId || `SB-GRIEV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        category: selectedCategory as any,
        description: description || `Reported ${selectedCategory} hazard.`,
        location,
        imageUrl: processedImage || undefined,
        department: data.department || "Municipal Grievance Redressal Cell",
        priority: data.priority || "High",
        suggestedTitle: data.suggestedTitle || `Grievance regarding ${selectedCategory}`,
        complaintText: data.complaintText || "Dear Officer, I request you to repair this civic hazard immediately.",
        trackingStatus: "Received",
        statusTimeline: {
          received: new Date().toISOString()
        },
        estimatedSLA: data.estimatedSLA || "48 hours",
        createdAt: new Date().toISOString()
      };

      const updated = [newComplaint, ...complaints];
      onUpdateComplaints(updated);
      setActiveComplaintId(newComplaint.id);

      onAddNotification(
        t("Grievance Filed Successfully!", lang),
        t("Your civic ticket was created and assigned to government cell.", lang),
        "complaint"
      );

      // Reset Form fields
      setDescription("");
      setBase64Image(null);

    } catch (err: any) {
      console.error("Complaint filing error:", err);
      alert(t("Failed to file complaint: ", lang) + err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  // Helper to step-advance mock tracker for demo satisfaction!
  const handleAdvanceMockStatus = (compId: string) => {
    const updated = complaints.map(c => {
      if (c.id === compId) {
        let nextStatus: CivicGrievance['trackingStatus'] = "Received";
        const timeline = { ...c.statusTimeline };
        
        if (c.trackingStatus === "Received") {
          nextStatus = "Assigned";
          timeline.assigned = new Date().toISOString();
        } else if (c.trackingStatus === "Assigned") {
          nextStatus = "Processing";
          timeline.processing = new Date().toISOString();
        } else if (c.trackingStatus === "Processing") {
          nextStatus = "Resolved";
          timeline.resolved = new Date().toISOString();
        } else {
          return c; // Already resolved, do nothing
        }

        onAddNotification(
          t("Ticket Status Update", lang),
          t("Your civic ticket has moved to processing status.", lang),
          "complaint"
        );

        return {
          ...c,
          trackingStatus: nextStatus,
          statusTimeline: timeline
        };
      }
      return c;
    });

    onUpdateComplaints(updated);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans px-2 py-0.5 rounded-full";
      case "High": return "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans px-2 py-0.5 rounded-full";
      case "Medium": return "bg-blue-500/10 text-blue-400 border border-blue-500/20 font-sans px-2 py-0.5 rounded-full";
      default: return "bg-slate-800 text-slate-400 border border-slate-700 font-sans px-2 py-0.5 rounded-full";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="grievance-root">
      
      {/* Left Column: Complaint filing form */}
      <div className="lg:col-span-2 space-y-6" id="grievance-left">
        
        <div className="bg-black/40 border border-violet-500/15 backdrop-blur-md rounded-3xl p-6 relative overflow-hidden" id="grievance-form-card">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 mb-4">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-bold text-white tracking-tight font-display">{t("Report Local Civic Issue", lang)}</h3>
          </div>

          <form onSubmit={handleRegisterComplaint} className="space-y-4" id="grievance-form">
            
            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 font-sans">{t("Select Issue Category", lang)}</label>
              <div className="flex flex-wrap gap-2" id="grievance-categories">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-xs px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 cursor-pointer transition font-sans border ${
                      selectedCategory === cat.id
                        ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_12px_rgba(124,58,237,0.25)]"
                        : "bg-black/45 border-violet-500/10 text-slate-400 hover:text-slate-300 hover:bg-[#12082b]"
                    }`}
                  >
                    <span>{cat.icon}</span> {t(cat.label, lang)}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid for description & visual attachment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Photo upload Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 font-sans">{t("Upload Visual Proof", lang)}</label>
                
                <div
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-2xl h-[175px] flex flex-col items-center justify-center cursor-pointer transition text-center p-4 font-sans relative overflow-hidden group ${
                    base64Image ? "border-violet-500 bg-[#0d0720]/40" : "border-violet-500/15 hover:border-violet-500/35 bg-black/25 hover:shadow-[0_0_15px_rgba(124,58,237,0.05)]"
                  }`}
                  id="grievance-photo-box"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                  />

                  {base64Image ? (
                    <div className="relative w-full h-full" id="uploaded-image-preview">
                      <img
                        src={base64Image}
                        alt="Civic Issue Proof"
                        className="w-full h-full object-cover rounded-xl referrer-policy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-white font-bold bg-[#0d0720] border border-violet-500/30 px-3 py-1.5 rounded-lg">{t("Change Photo", lang)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5" id="grievance-uploader-cta">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 mx-auto">
                        <UploadCloud className="w-5.5 h-5.5 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-[10.5px] font-bold text-slate-200">{t("Click to upload photo proof", lang)}</p>
                        <p className="text-[9px] text-slate-400 font-sans mt-0.5 leading-normal max-w-[180px] mx-auto">{t("Camera shots of Garbage, Potholes, street lights, leaks", lang)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Text inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">{t("Location details (Demo GPS)", lang)}</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-violet-500/20 rounded-xl px-4 py-3 pl-10 text-white text-xs focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 font-sans"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                    />
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-sans">{t("Describe the issue in your own words", lang)}</label>
                  <textarea
                    placeholder={t("Provide landmarks, depth, duration of the issue...", lang)}
                    rows={3}
                    className="w-full bg-black/40 border border-violet-500/20 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 resize-none font-sans"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </div>

            </div>

            {/* Submit button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                {loading && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-violet-400 animate-pulse font-sans">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                    <span>{loadingStep}</span>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-extrabold px-6 py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow-[0_0_15px_rgba(124,58,237,0.25)] font-sans ml-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("Processing AI Ticket...", lang)}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> {t("Analyze and File Complaint", lang)}
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* List of filed grievances */}
        <div className="space-y-4" id="grievance-list-block">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 font-display tracking-wide">
            {t("Registered Grievance Trackers", lang)} ({complaints.length})
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="grievance-trackers">
            {complaints.map(comp => {
              const isSelected = comp.id === activeComplaintId;
              
              return (
                <div
                  key={comp.id}
                  onClick={() => setActiveComplaintId(comp.id)}
                  className={`p-4 border rounded-2xl cursor-pointer transition flex justify-between items-center group font-sans ${
                    isSelected
                      ? "border-violet-500 bg-[#0f0622]/80 shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                      : "bg-[#080414] border-violet-500/10 hover:border-violet-500/25 hover:bg-[#0f0622]"
                  }`}
                  id={`grievance-card-${comp.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl shrink-0">
                      {comp.category === "garbage" ? "🗑️" : comp.category === "pothole" ? "🕳️" : comp.category === "street_light" ? "💡" : comp.category === "water_leakage" ? "🚰" : "🚧"}
                    </span>
                    <div>
                      <span className="text-[9px] font-mono font-bold text-slate-500 block">{comp.trackingId}</span>
                      <h4 className="text-xs font-bold text-slate-200 mt-0.5 line-clamp-1 font-sans">{t(comp.suggestedTitle, lang)}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5 block truncate font-sans">{comp.location}</p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5 font-sans" id="grievance-card-status">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      comp.trackingStatus === "Resolved"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-sans"
                        : comp.trackingStatus === "Processing"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20 font-sans"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20 font-sans"
                    }`}>
                      {t(comp.trackingStatus, lang)}
                    </span>
                    <span className="text-[8px] text-slate-500 block font-mono">
                      {new Date(comp.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right Column: Visual Timeline tracker */}
      <div className="space-y-4" id="grievance-right">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 font-display tracking-wide">{t("Live Tracking Timeline", lang)}</h3>
        
        <div className="bg-black/40 border border-violet-500/15 rounded-3xl p-6 backdrop-blur-md h-full flex flex-col relative overflow-hidden" id="grievance-tracker-panel">
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <AnimatePresence mode="wait">
            {selectedComplaint ? (
              <motion.div
                key={selectedComplaint.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 flex-1 flex flex-col justify-between"
                id="grievance-timeline-view"
              >
                <div className="space-y-4">
                  
                  {/* Complaint visual thumbnail */}
                  {selectedComplaint.imageUrl && (
                    <div className="h-28 rounded-xl overflow-hidden border border-violet-500/10" id="timeline-thumbnail">
                      <img
                        src={selectedComplaint.imageUrl}
                        alt="Scanned grievance proof"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div>
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">{selectedComplaint.trackingId}</span>
                    <h4 className="text-xs font-bold text-white leading-relaxed mt-1">{t(selectedComplaint.suggestedTitle, lang)}</h4>
                    <div className="mt-1.5 flex items-center">
                      <span className={`${getPriorityColor(selectedComplaint.priority)} text-[9px] font-bold`}>
                        {t("Priority:", lang)} {t(selectedComplaint.priority, lang)}
                      </span>
                    </div>
                  </div>

                  {/* Meta Department Assignee */}
                  <div className="grid grid-cols-2 gap-3 text-[10px]" id="timeline-meta">
                    <div className="bg-[#090416] p-3 rounded-xl border border-violet-500/10 font-sans">
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px] font-sans">{t("Assigned Bureau", lang)}</span>
                      <span className="text-slate-200 font-bold block truncate mt-1 font-sans">{t(selectedComplaint.department, lang)}</span>
                    </div>

                    <div className="bg-[#090416] p-3 rounded-xl border border-violet-500/10 font-sans">
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px] font-sans">{t("Resolution SLA", lang)}</span>
                      <span className="text-violet-400 font-bold block mt-1 font-sans">{t(selectedComplaint.estimatedSLA, lang)}</span>
                    </div>
                  </div>

                  {/* Progress Timeline Nodes */}
                  <div className="space-y-4 pt-2 font-sans" id="timeline-flow-nodes">
                    {[
                      { status: "Received", title: t("Grievance Received", lang), desc: t("Ticket logged on Smart Bharat Node.", lang) },
                      { status: "Assigned", title: t("Officer Assigned", lang), desc: t("Assigned to Ward Grievance Commissioner.", lang) },
                      { status: "Processing", title: t("Resolution Active", lang), desc: t("On-site repair team dispatched.", lang) },
                      { status: "Resolved", title: t("Issue Resolved", lang), desc: t("Verified solved by inspector & closed.", lang) }
                    ].map((step, idx) => {
                      const statusesList = ["Received", "Assigned", "Processing", "Resolved"];
                      const currentIdx = statusesList.indexOf(selectedComplaint.trackingStatus);
                      const stepIdx = statusesList.indexOf(step.status);
                      const isCompleted = currentIdx >= stepIdx;
                      const isActive = selectedComplaint.trackingStatus === step.status;

                      return (
                        <div key={step.status} className="flex gap-3 relative font-sans" id={`timeline-node-${step.status}`}>
                          {idx < 3 && (
                            <div className={`absolute left-2.5 top-6 w-[1.5px] h-8 bg-violet-500/10 ${isCompleted && currentIdx > stepIdx ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : ""}`} />
                          )}
                          
                          <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 border z-10 font-sans transition ${
                            isActive
                              ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_10px_rgba(124,58,237,0.4)]"
                              : isCompleted
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                              : "bg-[#090416] border-violet-500/10 text-slate-600"
                          }`}>
                            {isCompleted ? <Check className="w-3 h-3" /> : <Circle className="w-2 h-2 fill-current" />}
                          </div>

                          <div>
                            <h5 className={`text-[11px] font-bold leading-none font-sans ${isCompleted ? "text-slate-200" : "text-slate-500"}`}>
                              {step.title}
                            </h5>
                            <p className="text-[9px] text-slate-400 mt-1 leading-relaxed font-sans max-w-[210px]">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* ADVANCE STATUS ACTION (FOR DEMO SATISFACTION!) */}
                {selectedComplaint.trackingStatus !== "Resolved" && (
                  <div className="pt-4 border-t border-violet-500/10 mt-4">
                    <button
                      onClick={() => handleAdvanceMockStatus(selectedComplaint.id)}
                      className="w-full bg-[#090416] border border-violet-500/10 hover:border-violet-500/30 hover:text-white text-slate-300 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer font-sans hover:bg-violet-950/20"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" /> {t("Advance Ticket Status (Demo)", lang)}
                    </button>
                  </div>
                )}

              </motion.div>
            ) : (
              <div className="text-center py-20 text-slate-500 space-y-3 flex-1 flex flex-col justify-center" id="grievance-timeline-empty">
                <FileText className="w-10 h-10 text-violet-400 animate-pulse mx-auto opacity-30" />
                <p className="text-xs font-semibold text-slate-300">{t("Select a complaint ticket", lang)}</p>
                <p className="text-[10px] leading-relaxed text-slate-500 px-4">
                  {t("Select any registered ticket on the left list to review detailed government departments, responsible authorities, resolution SLAs, and live timeline milestones.", lang)}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}

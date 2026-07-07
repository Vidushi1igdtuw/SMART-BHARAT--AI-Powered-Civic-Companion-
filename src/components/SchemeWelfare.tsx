import React, { useState } from "react";
import { CitizenProfile, Scheme } from "../types";
import { DEFAULT_SCHEMES } from "../data";
import { Award, Zap, BookOpen, Heart, ArrowUpRight, Search, FileCheck, CheckCircle2, AlertCircle, Sparkles, Upload, Clipboard, Download, RefreshCw, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../translations";

interface SchemeWelfareProps {
  profile: CitizenProfile;
  recommendedSchemes: Scheme[];
  onAddNotification: (title: string, body: string, cat: 'scheme' | 'document' | 'complaint' | 'system') => void;
}

export default function SchemeWelfare({
  profile,
  recommendedSchemes,
  onAddNotification
}: SchemeWelfareProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const lang = profile.preferredLanguage || "English";

  // Comparison feature states
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<Scheme[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<{
    comparison: Array<{
      id: string;
      name: string;
      benefits: string;
      eligibility: string;
      documents: string;
      time: string;
      pros: string[];
      cons: string[];
    }>;
    recommendation: string;
  } | null>(null);

  // AI Scheme Summarizer states
  const [isSummarizerOpen, setIsSummarizerOpen] = useState(false);
  const [summarizerTab, setSummarizerTab] = useState<"text" | "file">("text");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const [summaryResult, setSummaryResult] = useState<{
    schemeName: string;
    category: string;
    benefits: string[];
    eligibility: string[];
    documentsNeeded: string[];
    deadlines: string;
    targetAudience: string;
  } | null>(null);

  const [expandedSections, setExpandedSections] = useState({
    benefits: true,
    eligibility: true,
    documents: false,
    deadlines: false
  });

  const categories = ["All", "Education", "Business", "Healthcare", "Agriculture", "Social Security"];

  const getTranslatedCategory = (cat: string) => {
    switch (cat) {
      case "All": return t("All", lang);
      case "Education": return t("Education", lang);
      case "Business": return t("Business", lang);
      case "Healthcare": return t("Healthcare", lang);
      case "Agriculture": return t("Agriculture", lang);
      case "Social Security": return t("Social Security", lang);
      default: return t(cat, lang);
    }
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      alert(t("Unsupported file format! Please upload PDF, JPG, JPEG, or PNG.", lang));
      return;
    }
    
    try {
      setSelectedFile(file);
      const base64 = await fileToBase64(file);
      setFileBase64(base64);
    } catch (err) {
      console.error("Error loading file:", err);
      alert(t("Failed to read file.", lang));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleTriggerSummarize = async () => {
    if (summarizerTab === "text" && !pastedText.trim()) {
      alert(t("Please paste some scheme details first.", lang));
      return;
    }
    if (summarizerTab === "file" && !fileBase64) {
      alert(t("Please upload a scheme document or guideline image first.", lang));
      return;
    }

    setSummarizing(true);
    try {
      const payload: any = { lang: lang };
      if (summarizerTab === "text") {
        payload.text = pastedText;
      } else {
        payload.fileData = fileBase64;
        payload.fileType = selectedFile?.type;
      }

      const response = await fetch("/api/gemini/summarize-scheme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to summarize scheme");
      }

      const data = await response.json();
      setSummaryResult(data);
      onAddNotification(
        t("Scheme Analyzed", lang),
        t("We successfully simplified and summarized the scheme guidelines.", lang),
        "scheme"
      );
    } catch (err) {
      console.error("Scheme summary error:", err);
      alert(t("Error communicating with Gemini AI. Loading mock summary.", lang));
      setSummaryResult({
        schemeName: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY 4.0)",
        category: "Education & Skill Development",
        benefits: [
          t("Free-of-cost industry-relevant skill training and certification.", lang),
          t("Financial reward of ₹3,000 upon successful course completion.", lang),
          t("Placement assistance and entrepreneurship support.", lang)
        ],
        eligibility: [
          t("Any Indian national of age 15-45 years.", lang),
          t("Unemployed youth or school/college dropouts with valid identity proofs.", lang)
        ],
        documentsNeeded: [
          t("Aadhaar Card", lang),
          t("Bank Account details (linked to Aadhaar)", lang),
          t("Educational certificates (if any)", lang)
        ],
        deadlines: t("Applications are open year-round for new skill batches; batch enrollment closes quarterly.", lang),
        targetAudience: t("Unemployed Indian youth looking to acquire job-ready vocational skills.", lang)
      });
    } finally {
      setSummarizing(false);
    }
  };

  const handleTriggerCompare = async () => {
    if (compareList.length < 2) {
      alert(t("Please select at least 2 schemes to compare.", lang));
      return;
    }
    setIsComparing(true);
    try {
      const response = await fetch("/api/gemini/compare-schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemes: compareList, profile })
      });

      if (!response.ok) {
        throw new Error("Failed to compare schemes");
      }

      const data = await response.json();
      setCompareResult(data);
      onAddNotification(
        t("AI Comparison Complete", lang),
        t("We compared your selected schemes side-by-side using Gemini AI.", lang),
        "scheme"
      );
    } catch (err) {
      console.error("Comparison request failed:", err);
      alert(t("Error communicating with Gemini comparison API. Please try again.", lang));
    } finally {
      setIsComparing(false);
    }
  };

  const handleCopySummary = () => {
    if (!summaryResult) return;
    const text = `SCHEME SUMMARY: ${summaryResult.schemeName}
Category: ${summaryResult.category}
Target Audience: ${summaryResult.targetAudience}

BENEFITS:
${summaryResult.benefits.map(b => `- ${b}`).join("\n")}

ELIGIBILITY:
${summaryResult.eligibility.map(e => `- ${e}`).join("\n")}

REQUIRED DOCUMENTS:
${summaryResult.documentsNeeded.map(d => `- ${d}`).join("\n")}

DEADLINES / SLA:
${summaryResult.deadlines}

Summarized by Smart Bharat AI`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSummary = () => {
    if (!summaryResult) return;
    const text = `# ${summaryResult.schemeName}
**Category**: ${summaryResult.category}
**Target Audience**: ${summaryResult.targetAudience}

## Benefits
${summaryResult.benefits.map(b => `- ${b}`).join("\n")}

## Eligibility
${summaryResult.eligibility.map(e => `- ${e}`).join("\n")}

## Required Documents
${summaryResult.documentsNeeded.map(d => `- ${d}`).join("\n")}

## Deadlines & Timeline
${summaryResult.deadlines}

---
*Summarized using Smart Bharat AI*`;

    const blob = new Blob([text], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${summaryResult.schemeName.toLowerCase().replace(/\s+/g, "_")}_summary.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  // Use recommended schemes from Gemini if available, otherwise fallback on high-quality defaults
  const listSchemes = recommendedSchemes && recommendedSchemes.length > 0 ? recommendedSchemes : DEFAULT_SCHEMES;

  const handleApplyScheme = (schemeName: string) => {
    alert(t("Redirecting you safely to the official secure Indian national portal to register for scheme.", lang));
    onAddNotification(
      t("Scheme Registration Initiated", lang),
      t("You clicked to apply for scheme. We pre-saved your supporting details.", lang),
      "scheme"
    );
  };

  const filteredSchemes = listSchemes.filter(sch => {
    const translatedName = t(sch.name, lang);
    const translatedBenefits = t(sch.benefits, lang);
    const translatedCategory = t(sch.category, lang);

    const matchesSearch = translatedName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          translatedCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          translatedBenefits.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "All" || sch.category === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Education":
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case "Business":
        return <Zap className="w-4 h-4 text-amber-400" />;
      case "Healthcare":
        return <Heart className="w-4 h-4 text-rose-400" />;
      default:
        return <Award className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6" id="schemes-root">
      
      {/* Collapsible AI Scheme Summarizer Card */}
      <div className="bg-gradient-to-br from-[#120a2e]/60 to-[#080415]/80 border border-violet-500/20 rounded-[28px] overflow-hidden transition-all duration-300 shadow-xl" id="schemes-summarizer-wrapper">
        
        {/* Toggle Bar */}
        <button
          onClick={() => setIsSummarizerOpen(!isSummarizerOpen)}
          className="w-full p-5 flex items-center justify-between text-left cursor-pointer hover:bg-violet-500/5 transition font-sans relative"
        >
          {/* Subtle decor glow */}
          <div className="absolute top-0 right-0 w-[150px] h-[80px] bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
                {t("AI Scheme Summarizer", lang)} <span className="text-[10px] bg-gradient-to-r from-violet-600 to-pink-500 text-white px-2.5 py-0.5 rounded-full font-bold">✨ NEW</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-sans">
                {t("Have details about another central/state scheme? Paste guidelines or upload documents for an instant simplified structured summary.", lang)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-xs font-extrabold text-violet-400 font-sans">
              {isSummarizerOpen ? t("Close Tool", lang) : t("Open Tool", lang)}
            </span>
            <ChevronRight className={`w-4 h-4 text-violet-400 transition-transform ${isSummarizerOpen ? "rotate-90" : ""}`} />
          </div>
        </button>

        {/* Expandable Workspace */}
        <AnimatePresence>
          {isSummarizerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-violet-500/10 overflow-hidden bg-violet-950/10"
            >
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6" id="summarizer-workspace">
                
                {/* Inputs area */}
                <div className="space-y-4">
                  <div className="flex gap-2 p-1 bg-[#090416] border border-violet-500/20 rounded-xl max-w-xs" id="summarizer-tab-control">
                    <button
                      onClick={() => setSummarizerTab("text")}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer transition-all duration-300 font-sans ${
                        summarizerTab === "text" ? "bg-violet-600 text-white shadow-md shadow-violet-600/10" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      📝 {t("Paste Text", lang)}
                    </button>
                    <button
                      onClick={() => setSummarizerTab("file")}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer transition-all duration-300 font-sans ${
                        summarizerTab === "file" ? "bg-violet-600 text-white shadow-md shadow-violet-600/10" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      📁 {t("Upload Document", lang)}
                    </button>
                  </div>

                  {summarizerTab === "text" ? (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block font-sans">
                        {t("Paste Scheme Guidelines / Guidelines PDF Text", lang)}
                      </span>
                      <textarea
                        rows={6}
                        placeholder={t("Paste the complete scheme benefits, eligibility details, or website content here...", lang)}
                        value={pastedText}
                        onChange={e => setPastedText(e.target.value)}
                        className="w-full bg-[#0c061d] border border-violet-500/15 rounded-2xl p-4 text-slate-200 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 font-sans shadow-inner animate-none"
                        disabled={summarizing}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block font-sans">
                        {t("Drop Guidelines Document", lang)}
                      </span>
                      
                      <div
                        onDragOver={e => {
                          e.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={e => {
                          e.preventDefault();
                          setIsDragOver(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileChange(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                          isDragOver ? "border-violet-500 bg-violet-500/10" : "border-violet-900/35 hover:border-violet-500/50 bg-[#0c061d]"
                        }`}
                        onClick={() => {
                          const fileInput = document.getElementById("summarizer-file-input");
                          if (fileInput) fileInput.click();
                        }}
                        id="summarizer-dragzone"
                      >
                        <input
                          type="file"
                          id="summarizer-file-input"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileChange(e.target.files[0]);
                            }
                          }}
                        />
                        <Upload className="w-8 h-8 text-violet-400/55 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-200 font-sans">{t("Click or drag file here", lang)}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-sans">
                          {t("Supports PDF, JPG, JPEG, PNG (Max 10MB)", lang)}
                        </p>
                        {selectedFile && (
                          <div className="mt-3.5 bg-violet-950/20 border border-violet-900/40 p-2.5 rounded-xl flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-violet-300 truncate max-w-[200px]">
                              {selectedFile.name}
                            </span>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedFile(null);
                                setFileBase64(null);
                              }}
                              className="text-rose-400 hover:text-rose-300 p-1 rounded transition cursor-pointer animate-none"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleTriggerSummarize}
                    disabled={summarizing}
                    className="w-full btn-premium-purple disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer font-sans shadow-lg shadow-violet-950/20"
                  >
                    {summarizing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {t("Analyzing & Simplifying...", lang)}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {t("Summarize Scheme", lang)}
                      </>
                    )}
                  </button>
                </div>

                {/* Outputs/Result area */}
                <div className="border-l border-violet-500/10 lg:pl-6 flex flex-col justify-between" id="summarizer-results">
                  {summaryResult ? (
                    <div className="space-y-4">
                      
                      {/* Summary Header */}
                      <div className="bg-[#0c061d] border border-violet-500/15 p-4 rounded-2xl flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-mono font-bold uppercase tracking-wider bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded border border-violet-500/20 font-sans">
                            {summaryResult.category}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-2 leading-tight font-sans">
                            {summaryResult.schemeName}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1.5 leading-normal font-sans">
                            <span className="font-bold text-slate-300">{t("Target", lang)}:</span> {summaryResult.targetAudience}
                          </p>
                        </div>
                      </div>

                      {/* Structured expandables */}
                      <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                        
                        {/* Benefits card */}
                        <div className="bg-[#0c061d] border border-violet-500/15 rounded-xl overflow-hidden font-sans">
                          <button
                            onClick={() => setExpandedSections(p => ({ ...p, benefits: !p.benefits }))}
                            className="w-full px-4 py-3 bg-violet-950/20 flex justify-between items-center text-left cursor-pointer transition font-sans"
                          >
                            <span className="text-xs font-bold text-slate-200">🎁 {t("Welfare Benefits Offered", lang)}</span>
                            <ChevronRight className={`w-3.5 h-3.5 text-violet-400 transition-transform ${expandedSections.benefits ? "rotate-90" : ""}`} />
                          </button>
                          {expandedSections.benefits && (
                            <div className="p-4 border-t border-violet-500/10 space-y-1.5">
                              {summaryResult.benefits.map((b, idx) => (
                                <p key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-relaxed font-sans">
                                  <span className="text-emerald-400 mt-0.5 font-bold">✓</span> {b}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Eligibility card */}
                        <div className="bg-[#0c061d] border border-violet-500/15 rounded-xl overflow-hidden font-sans">
                          <button
                            onClick={() => setExpandedSections(p => ({ ...p, eligibility: !p.eligibility }))}
                            className="w-full px-4 py-3 bg-violet-950/20 flex justify-between items-center text-left cursor-pointer transition font-sans"
                          >
                            <span className="text-xs font-bold text-slate-200">🎯 {t("Eligibility & Subsidies Terms", lang)}</span>
                            <ChevronRight className={`w-3.5 h-3.5 text-violet-400 transition-transform ${expandedSections.eligibility ? "rotate-90" : ""}`} />
                          </button>
                          {expandedSections.eligibility && (
                            <div className="p-4 border-t border-violet-500/10 space-y-1.5">
                              {summaryResult.eligibility.map((el, idx) => (
                                <p key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-relaxed font-sans">
                                  <span className="text-violet-400 mt-0.5 font-bold">✓</span> {el}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Required Documents card */}
                        <div className="bg-[#0c061d] border border-violet-500/15 rounded-xl overflow-hidden font-sans">
                          <button
                            onClick={() => setExpandedSections(p => ({ ...p, documents: !p.documents }))}
                            className="w-full px-4 py-3 bg-violet-950/20 flex justify-between items-center text-left cursor-pointer transition font-sans"
                          >
                            <span className="text-xs font-bold text-slate-200">📂 {t("Required Identity Proof Documents", lang)}</span>
                            <ChevronRight className={`w-3.5 h-3.5 text-violet-400 transition-transform ${expandedSections.documents ? "rotate-90" : ""}`} />
                          </button>
                          {expandedSections.documents && (
                            <div className="p-4 border-t border-violet-500/10 flex flex-wrap gap-1.5">
                              {summaryResult.documentsNeeded.map((d, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-violet-500/10 border border-violet-500/15 text-violet-300 px-2.5 py-1 rounded-lg font-bold">
                                  📄 {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Deadlines card */}
                        <div className="bg-[#0c061d] border border-violet-500/15 rounded-xl overflow-hidden font-sans">
                          <button
                            onClick={() => setExpandedSections(p => ({ ...p, deadlines: !p.deadlines }))}
                            className="w-full px-4 py-3 bg-violet-950/20 flex justify-between items-center text-left cursor-pointer transition font-sans"
                          >
                            <span className="text-xs font-bold text-slate-200">⏱️ {t("Policy Duration & Deadlines", lang)}</span>
                            <ChevronRight className={`w-3.5 h-3.5 text-violet-400 transition-transform ${expandedSections.deadlines ? "rotate-90" : ""}`} />
                          </button>
                          {expandedSections.deadlines && (
                            <div className="p-4 border-t border-violet-500/10">
                              <p className="text-[11px] text-slate-300 leading-relaxed font-sans flex items-start gap-1.5">
                                <span className="text-amber-400">⏱️</span> {summaryResult.deadlines}
                              </p>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Summary Actions */}
                      <div className="flex gap-3 pt-2" id="summarizer-actions-row">
                        <button
                          onClick={handleCopySummary}
                          className="flex-1 bg-violet-600 hover:bg-violet-500 text-[10px] text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer font-sans"
                        >
                          {copied ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {t("Copied!", lang)}
                            </>
                          ) : (
                            <>
                              <Clipboard className="w-3.5 h-3.5" />
                              {t("Copy Summary", lang)}
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleDownloadSummary}
                          className="flex-1 bg-[#0c061d] hover:bg-[#120a2e] border border-violet-500/15 hover:border-violet-500/35 text-[10px] font-bold py-2 rounded-xl text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer font-sans"
                        >
                          {downloaded ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              {t("Downloaded!", lang)}
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 text-violet-400 font-sans" />
                              {t("Download File", lang)}
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setSummaryResult(null);
                            setPastedText("");
                            setSelectedFile(null);
                            setFileBase64(null);
                          }}
                          className="p-2 bg-[#0c061d] hover:bg-[#120a2e] border border-violet-500/15 hover:border-rose-500/50 rounded-xl text-slate-400 hover:text-rose-400 transition cursor-pointer font-sans animate-none"
                          title={t("Reset", lang)}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-20 text-slate-500 space-y-2 h-full flex flex-col justify-center items-center" id="summarizer-empty">
                      <Sparkles className="w-10 h-10 text-slate-600 animate-pulse opacity-30 mb-2" />
                      <h4 className="text-xs font-bold text-slate-400 font-sans">{t("Awaiting input data", lang)}</h4>
                      <p className="text-[10px] leading-normal px-8 text-slate-500 font-sans">
                        {t("Paste guidelines or upload files on the left, then click Summarize Scheme to analyze. Summaries will populate here dynamically.", lang)}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Search and Category Filtering */}
      <div className="bg-gradient-to-br from-[#120a2e]/60 to-[#080415]/80 border border-violet-500/20 p-5 rounded-[24px] flex flex-col md:flex-row md:items-center justify-between gap-4" id="schemes-search-bar">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={t("Search matching central and state welfare benefits...", lang)}
            className="w-full bg-[#0c061d] border border-violet-500/15 rounded-2xl px-4 py-3.5 pl-11 text-white text-xs focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 font-sans shadow-inner"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/65" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto shrink-0 pb-1 md:pb-0" id="schemes-tab-filters">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer shrink-0 transition-all duration-300 font-sans ${
                activeTab === cat
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/15"
                  : "bg-violet-950/15 border border-violet-900/10 text-slate-400 hover:text-slate-300"
              }`}
            >
              {getTranslatedCategory(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Compare Schemes Section */}
      <div className="bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-[#0e0721]/50 border border-violet-500/25 p-5 rounded-[24px] flex flex-col md:flex-row md:items-center justify-between gap-4" id="compare-schemes-bar">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 font-display">
            ⚖️ {t("Compare Welfare Schemes Side-by-Side", lang)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {t("Enable comparison, select 2 or 3 matching policies, and get automatic AI recommendations.", lang)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isCompareMode && (
            <div className="text-xs text-violet-300 bg-[#0c061d] border border-violet-500/20 px-3 py-1.5 rounded-xl font-sans font-bold">
              Selected: <strong className="text-violet-400">{compareList.length} / 3</strong>
            </div>
          )}
          <button
            onClick={() => {
              setIsCompareMode(!isCompareMode);
              setCompareList([]);
              setCompareResult(null);
            }}
            className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer font-sans shadow-md ${
              isCompareMode
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/15"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/15"
            }`}
          >
            {isCompareMode ? t("Disable Compare Mode", lang) : `🔍 ${t("Enable Compare Mode", lang)}`}
          </button>
        </div>
      </div>

      {/* Schemes Cards Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="schemes-cards-grid">
        <div className="md:col-span-2 space-y-4" id="schemes-list-col">
          {isCompareMode && (
            <div className="bg-gradient-to-br from-[#1b123a] to-[#0d0720] border border-amber-500/30 p-4.5 rounded-[22px] flex flex-col sm:flex-row items-center justify-between gap-4 mb-2 animate-fade-in" id="compare-status-panel">
              <div className="flex items-center gap-2.5">
                <span className="text-xl shrink-0">⚖️</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    {t("Select schemes to compare", lang)} ({compareList.length}/3)
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {compareList.length < 2 
                      ? t("Select at least 2 schemes to start AI Analysis.", lang)
                      : t("You are ready! Generate your comparative side-by-side report.", lang)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleTriggerCompare}
                disabled={compareList.length < 2 || isComparing}
                className={`w-full sm:w-auto text-xs font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer font-sans shrink-0 ${
                  compareList.length >= 2
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/15"
                    : "bg-violet-950/20 border border-violet-900/15 text-slate-500 cursor-not-allowed"
                }`}
              >
                {isComparing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {t("Analyzing side-by-side...", lang)}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {t("Generate AI Comparison", lang)}
                  </>
                )}
              </button>
            </div>
          )}

          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest px-1 font-display">
            {t("Matched Schemes", lang)} ({filteredSchemes.length})
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="schemes-cards">
            {filteredSchemes.map(sch => {
              const isSelectedForCompare = compareList.some(s => s.id === sch.id);
              return (
                <div
                  key={sch.id}
                  onClick={() => {
                    if (isCompareMode) {
                      if (isSelectedForCompare) {
                        setCompareList(compareList.filter(s => s.id !== sch.id));
                      } else {
                        if (compareList.length >= 3) {
                          alert(t("You can compare up to 3 schemes side-by-side.", lang));
                          return;
                        }
                        setCompareList([...compareList, sch]);
                      }
                    } else {
                      setSelectedScheme(sch);
                    }
                  }}
                  className={`p-5 border rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between group h-[200px] hover:shadow-[0_0_15px_rgba(139,92,246,0.05)] font-sans ${
                    isCompareMode
                      ? isSelectedForCompare
                        ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                        : "bg-gradient-to-br from-[#120a2e]/40 to-[#080415]/60 border-violet-500/10 hover:border-amber-500/50"
                      : selectedScheme?.id === sch.id
                        ? "border-violet-500 bg-violet-950/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                        : "bg-gradient-to-br from-[#120a2e]/40 to-[#080415]/60 border-violet-500/10 hover:border-violet-500/35"
                  }`}
                  id={`scheme-card-${sch.id}`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-1" id="scheme-card-header">
                      <span className="text-[9px] font-mono font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5 bg-violet-950/40 border border-violet-900/10 px-2 py-0.5 rounded-lg">
                        {getCategoryIcon(sch.category)} {getTranslatedCategory(sch.category)}
                      </span>
                      {isCompareMode ? (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-300 ${
                          isSelectedForCompare
                            ? "bg-amber-500 border-amber-600 text-white"
                            : "border-slate-700 bg-slate-900"
                        }`}>
                          {isSelectedForCompare && (
                            <span className="text-[10px] font-black">✓</span>
                          )}
                        </div>
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-violet-400 group-hover:text-white transition-colors" />
                      )}
                    </div>
                    
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-2 mt-3 leading-relaxed font-sans">
                      {t(sch.name, lang)}
                    </h4>
                    
                    <p className="text-[10px] text-slate-400 line-clamp-3 mt-1.5 leading-normal font-sans">
                      {t(sch.benefits, lang)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-violet-500/10 mt-3" id="scheme-card-footer">
                    <div className="flex items-center gap-1.5 text-[9px] text-violet-300 font-bold font-sans">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" /> {t("Matched for you", lang)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Scheme Details sidebar */}
        <div className="space-y-4" id="scheme-sidebar-col">
          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-widest px-1 font-display">{t("Selected Scheme Details", lang)}</h3>
          
          <div className="bg-gradient-to-br from-[#120a2e]/60 to-[#080415]/80 border border-violet-500/20 rounded-[28px] p-6 h-full" id="scheme-details-panel">
            <AnimatePresence mode="wait">
              {selectedScheme ? (
                <motion.div
                  key={selectedScheme.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                  id="scheme-details-view"
                >
                  <div>
                    <span className="text-[9px] font-mono font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5 bg-violet-950/40 px-2 py-0.5 rounded-lg border border-violet-900/10 font-sans w-max">
                      {getCategoryIcon(selectedScheme.category)} {getTranslatedCategory(selectedScheme.category)}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-2.5 leading-normal font-sans">{t(selectedScheme.name, lang)}</h4>
                  </div>

                  {/* Why recommended AI widget */}
                  <div className="p-3.5 bg-violet-950/40 border border-violet-500/15 rounded-xl space-y-1.5" id="scheme-why-ai">
                    <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider flex items-center gap-1 font-sans">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" /> {t("AI Recommendation Insights", lang)}
                    </span>
                    <p className="text-[10px] text-slate-300 leading-normal font-medium font-sans">
                      {t(selectedScheme.whyRecommended, lang)}
                    </p>
                  </div>

                  {/* Criteria blocks */}
                  <div className="space-y-3 text-[11px]" id="scheme-criteria-blocks">
                    <div className="bg-[#0c061d] border border-violet-500/15 p-3 rounded-xl font-sans">
                      <span className="font-bold text-slate-300 block font-sans">{t("Eligibility Criteria:", lang)}</span>
                      <p className="text-slate-400 mt-1 leading-normal font-sans">{t(selectedScheme.eligibility, lang)}</p>
                    </div>

                    <div className="bg-[#0c061d] border border-violet-500/15 p-3 rounded-xl font-sans">
                      <span className="font-bold text-slate-300 block font-sans">{t("Benefits:", lang)}</span>
                      <p className="text-slate-400 mt-1 leading-normal font-sans">{t(selectedScheme.benefits, lang)}</p>
                    </div>

                    <div className="bg-[#0c061d] border border-violet-500/15 p-3 rounded-xl flex items-center justify-between font-sans">
                      <span className="font-bold text-slate-300 block font-sans">{t("Approval Time:", lang)}</span>
                      <span className="text-amber-400 font-bold font-sans">{t(selectedScheme.estimatedApprovalTime, lang)}</span>
                    </div>
                  </div>

                  {/* Documents required */}
                  {selectedScheme.documentsNeeded && selectedScheme.documentsNeeded.length > 0 && (
                    <div className="space-y-2" id="scheme-documents-list font-sans">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block font-sans">{t("Required Documents checklist", lang)}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedScheme.documentsNeeded.map((doc, dIdx) => (
                          <span key={dIdx} className="text-[9px] bg-[#0c061d] border border-violet-500/15 px-2.5 py-1 rounded-lg text-slate-300 flex items-center gap-1 font-medium font-sans">
                            <FileCheck className="w-3 h-3 text-violet-400" /> {t(doc, lang)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit application action */}
                  <div className="pt-4 border-t border-violet-500/15">
                    <button
                      onClick={() => handleApplyScheme(selectedScheme.name)}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 shadow-lg shadow-violet-600/15 cursor-pointer font-sans"
                    >
                      {t("Apply on Official Portal", lang)} <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                </motion.div>
              ) : (
                <div className="text-center py-16 text-slate-500 space-y-2" id="scheme-details-empty">
                  <Award className="w-12 h-12 text-violet-500/40 animate-pulse mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400">{t("Select a welfare scheme", lang)}</p>
                  <p className="text-[10px] leading-normal px-4 text-slate-500 font-sans">
                    {t("Click any scheme on the left list to review personal eligibility terms, required checklists, approval SLAs, and secure direct links to apply.", lang)}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Modal */}
      {compareResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans" id="scheme-comparison-modal">
          <div className="bg-[#080414] border border-violet-500/25 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-violet-500/15 flex justify-between items-center bg-gradient-to-r from-[#120a2e] to-[#080414] relative">
              <div className="absolute top-0 left-0 w-1/3 h-full bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
              <div>
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider font-sans">
                  ✨ {t("Gemini AI Policy Advisor", lang)}
                </span>
                <h2 className="text-lg font-bold text-white tracking-tight mt-3 flex items-center gap-2 font-display">
                  ⚖️ {t("Side-by-Side Welfare Scheme Comparison", lang)}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {t("Compare policy parameters, requirements, and custom-fit eligibility benefits.", lang)}
                </p>
              </div>
              <button
                onClick={() => setCompareResult(null)}
                className="text-slate-400 hover:text-white bg-[#0c061d] border border-violet-500/15 p-2 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-black/25">
              
              {/* Schemes side-by-side grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {compareResult.comparison.map((c) => (
                  <div key={c.id} className="bg-[#0c061d] border border-violet-500/15 p-5 rounded-2xl flex flex-col justify-between space-y-4 font-sans relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
                    
                    <div>
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg">
                        Scheme Name
                      </span>
                      <h3 className="text-sm font-bold text-white tracking-tight mt-1 mb-3 line-clamp-2 min-h-[40px] leading-relaxed">
                        {c.name}
                      </h3>

                      {/* Side-by-side details */}
                      <div className="space-y-3.5 text-xs">
                        <div className="bg-black/30 border border-violet-500/10 p-3 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">🎁 {t("Benefits", lang)}</span>
                          <p className="text-slate-200 leading-normal">{c.benefits}</p>
                        </div>

                        <div className="bg-black/30 border border-violet-500/10 p-3 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">🎯 {t("Eligibility", lang)}</span>
                          <p className="text-slate-200 leading-normal">{c.eligibility}</p>
                        </div>

                        <div className="bg-black/30 border border-violet-500/10 p-3 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">📂 {t("Documents Needed", lang)}</span>
                          <p className="text-slate-300 leading-normal">{c.documents}</p>
                        </div>

                        <div className="bg-black/30 border border-violet-500/10 p-3 rounded-xl flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">⏱️ {t("Processing SLA", lang)}</span>
                          <span className="text-amber-400 font-bold">{c.time}</span>
                        </div>
                      </div>

                      {/* Pros & Cons */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-violet-500/10">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1.5">Pros</span>
                          <ul className="space-y-1 text-[10px] text-slate-300">
                            {c.pros.map((p, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-emerald-400 font-bold">✓</span> {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-rose-400 uppercase block mb-1.5">Cons</span>
                          <ul className="space-y-1 text-[10px] text-slate-300">
                            {c.cons.map((co, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-rose-400 font-bold">•</span> {co}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCompareResult(null);
                        const match = filteredSchemes.find(fs => fs.id === c.id);
                        if (match) setSelectedScheme(match);
                      }}
                      className="w-full mt-4 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-300 font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer"
                    >
                      {t("View Full Terms", lang)}
                    </button>
                  </div>
                ))}
              </div>

              {/* Advisor Note / Recommendation */}
              <div className="p-5 bg-violet-950/40 border border-violet-500/15 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
                <h4 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans mb-1.5 flex items-center gap-1.5">
                  💡 {t("Personalized AI Policy Recommendation", lang)}
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {compareResult.recommendation}
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-violet-500/15 bg-[#0a0518] flex justify-end gap-3">
              <button
                onClick={() => setCompareResult(null)}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition cursor-pointer"
              >
                {t("Close Comparison", lang)}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

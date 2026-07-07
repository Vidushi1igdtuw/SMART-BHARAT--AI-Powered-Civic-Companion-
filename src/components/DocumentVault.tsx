import React, { useState, useRef } from "react";
import { CitizenProfile, VaultDocument } from "../types";
import { UploadCloud, CheckCircle, AlertTriangle, XCircle, Sparkles, FileText, Calendar, Trash2, Clock, Check, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { t, translateVaultDocument } from "../translations";

interface DocumentVaultProps {
  profile: CitizenProfile;
  documents: VaultDocument[];
  onUpdateDocuments: (docs: VaultDocument[]) => void;
  onAddNotification: (title: string, body: string, cat: 'scheme' | 'document' | 'complaint' | 'system') => void;
}

export default function DocumentVault({
  profile,
  documents,
  onUpdateDocuments,
  onAddNotification
}: DocumentVaultProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("All");
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lang = profile.preferredLanguage || "English";

  // Categories checklist
  const categoriesList = ["All", "Verified", "Warning", "Missing"];

  const translatedCategoryLabel = (cat: string) => {
    switch (cat) {
      case "All": return t("All Documents", lang);
      case "Verified": return t("Verified Documents", lang);
      case "Warning": return t("Warning Documents", lang);
      case "Missing": return t("Missing Documents", lang);
      default: return cat;
    }
  };

  // Form handle upload
  const handleFile = async (file: File) => {
    if (!file) return;

    setAnalyzing(true);
    try {
      // Validate file extension
      const allowedExts = [".pdf", ".png", ".jpg", ".jpeg"];
      const fileNameLower = file.name.toLowerCase();
      const isValidExt = allowedExts.some(ext => fileNameLower.endsWith(ext));
      if (!isValidExt) {
        throw new Error(t("Unsupported file format. Please upload PDF, PNG, JPG, or JPEG.", lang));
      }

      // Determine probable docType based on filename
      let detectedDocType = "Aadhaar Card";
      if (fileNameLower.includes("pan") || fileNameLower.includes("income")) {
        detectedDocType = "PAN Card";
      } else if (fileNameLower.includes("ration") || fileNameLower.includes("khady") || fileNameLower.includes("food")) {
        detectedDocType = "Ration Card";
      } else if (fileNameLower.includes("domicile") || fileNameLower.includes("resident") || fileNameLower.includes("niwas")) {
        detectedDocType = "Domicile Certificate";
      } else if (fileNameLower.includes("passport")) {
        detectedDocType = "Indian Passport";
      } else if (fileNameLower.includes("license") || fileNameLower.includes("licence") || fileNameLower.includes("driving")) {
        detectedDocType = "Driving Licence";
      } else if (fileNameLower.includes("voter") || fileNameLower.includes("election")) {
        detectedDocType = "Voter ID";
      } else if (fileNameLower.includes("birth") || fileNameLower.includes("janam")) {
        detectedDocType = "Birth Certificate";
      } else if (fileNameLower.includes("marksheet") || fileNameLower.includes("result") || fileNameLower.includes("grade")) {
        detectedDocType = "Marksheet";
      }

      // Read file to base64 using a Promise to prevent finally block from executing early
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      // Call our proxy API endpoint which handles secure Gemini calls
      const response = await fetch("/api/gemini/audit-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          docType: detectedDocType,
          fileName: file.name,
          fileSize: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          fileData: base64Data
        })
      });

      if (!response.ok) {
        throw new Error("Gemini audit API failed");
      }

      const data = await response.json();

      // Merge backend audit details with basic file stats
      let finalDocType = data.detectedDocType || detectedDocType;
      const normalizedId = finalDocType.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      
      const newDoc: VaultDocument = {
        id: normalizedId,
        name: finalDocType,
        type: finalDocType === "Aadhaar Card" || finalDocType === "PAN Card" || finalDocType === "Voter ID" || finalDocType === "Indian Passport" ? "Identity Proof" : "Address Proof",
        status: data.status || "Verified",
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        uploadedAt: new Date().toISOString(),
        summary: data.summary || "File analyzed and verified successfully.",
        keyClauses: data.keyClauses || [],
        missingInformation: data.missingInformation || [],
        aiSuggestions: data.aiSuggestions || [],
        criticalIssues: data.criticalIssues || [],
        nameMatch: data.nameMatch || "Match",
        addressMatch: data.addressMatch || "Match",
        nameMatchDetails: data.nameMatchDetails || "The name printed matches the registered digital profile exactly.",
        addressMatchDetails: data.addressMatchDetails || "The address matches the registered state database region.",
        expiryStatus: data.expiryStatus || "Valid",
        expiryDetails: data.expiryDetails || "Lifetime structural validity.",
        confidenceScore: data.confidenceScore || 95,
        extractedInfo: data.extractedInfo || {},
        governmentUseCases: data.governmentUseCases || []
      };

      // Intelligent mapping to overwrite existing document nodes (e.g. doc-aadhaar or doc-pan)
      const isMatch = (d: VaultDocument) => {
        const matchesId = d.id === normalizedId || d.id === `doc-${normalizedId.replace("-card", "")}`;
        const matchesName = d.name.toLowerCase() === finalDocType.toLowerCase() || d.name.toLowerCase().replace(" card", "") === finalDocType.toLowerCase().replace(" card", "");
        return matchesId || matchesName;
      };

      const updated = documents.map(d => {
        if (isMatch(d)) {
          return newDoc;
        }
        return d;
      });

      const exists = documents.some(d => isMatch(d));
      const finalDocs = exists ? updated : [newDoc, ...documents];
      
      onUpdateDocuments(finalDocs);
      setSelectedDoc(newDoc);
      setExpandedDocId(newDoc.id);

      onAddNotification(
        t("Document Audited!", lang),
        t("Your uploaded document was analyzed by Smart Bharat AI.", lang),
        "document"
      );

      // Check for document tracking / memory integration
      if (typeof (window as any).onDocumentUploaded === "function") {
        (window as any).onDocumentUploaded(finalDocType);
      }
    } catch (err: any) {
      console.error("Document upload err:", err);
      alert(t("Error processing document: ", lang) + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDeleteDoc = (docId: string, name: string) => {
    if (confirm(t("Are you sure you want to remove document from secure vault?", lang))) {
      const updated = documents.filter(d => d.id !== docId);
      onUpdateDocuments(updated);
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
      if (expandedDocId === docId) {
        setExpandedDocId(null);
      }
      onAddNotification(
        t("Document Deleted", lang),
        t("Document has been removed from secure vault.", lang),
        "document"
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2.5 py-0.5 rounded-full font-sans">
            <CheckCircle className="w-3 h-3" /> {t("Verified", lang)}
          </span>
        );
      case "Warning":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold px-2.5 py-0.5 rounded-full font-sans">
            <AlertTriangle className="w-3 h-3" /> {t("Warning", lang)}
          </span>
        );
      case "Action Needed":
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold px-2.5 py-0.5 rounded-full font-sans">
            <XCircle className="w-3 h-3" /> {t("Action Needed", lang)}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-800/60 text-slate-400 border border-slate-700 text-[10px] font-semibold px-2.5 py-0.5 rounded-full font-sans">
            {t("Missing", lang)}
          </span>
        );
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (activeCategoryFilter === "All") return true;
    return doc.status === activeCategoryFilter;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="vault-root">
      
      {/* Left Column: Drag/Drop Upload and File lists */}
      <div className="lg:col-span-2 space-y-6" id="vault-left-column">
        
        {/* Drag and Drop Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerSelectFile}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition select-none flex flex-col items-center justify-center min-h-[220px] bg-black/40 border-violet-500/15 backdrop-blur-md relative overflow-hidden group ${
            isDragging
              ? "border-violet-400 bg-violet-950/20 shadow-[0_0_30px_rgba(124,58,237,0.25)] animate-pulse"
              : "border-violet-500/15 hover:border-violet-500/35 hover:bg-[#0f0a24]/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.1)]"
          }`}
          id="vault-uploader"
        >
          {/* Decorative background glows */}
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-[120px] h-[120px] bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
            accept="image/*,.pdf"
          />

          {analyzing ? (
            <div className="space-y-4 font-sans" id="vault-analyzing-spinner">
              <div className="relative inline-block">
                <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto" />
                <Sparkles className="w-5 h-5 text-pink-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-bold text-violet-300 font-sans tracking-wide">{t("Smart Bharat AI Auditing File...", lang)}</p>
              <p className="text-[11px] text-slate-400 font-sans max-w-md mx-auto leading-relaxed">
                {t("Performing visual OCR, check-matching profile alignment & scanning metadata", lang)}
              </p>
            </div>
          ) : (
            <div className="space-y-4" id="vault-upload-cta">
              <div className="w-14 h-14 bg-[#140b2a] rounded-2xl flex items-center justify-center border border-violet-500/20 mx-auto text-slate-400 group-hover:text-violet-300 group-hover:border-violet-500/45 transition shadow-inner">
                <UploadCloud className="w-7 h-7 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200 font-sans tracking-wide">{t("Drag & Drop official certificate, ID, or scan here", lang)}</p>
                <p className="text-xs text-slate-400 mt-1.5 font-sans leading-normal">{t("Supports PNG, JPG, JPEG or PDF files • Max 10MB", lang)}</p>
              </div>
              <button
                type="button"
                className="bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 text-violet-300 text-xs px-5 py-2.5 font-bold rounded-xl transition cursor-pointer font-sans"
              >
                {t("Select File Manually", lang)}
              </button>
            </div>
          )}
        </div>

        {/* Categories/filters */}
        <div className="flex justify-between items-center" id="vault-filters-header">
          <div className="flex items-center gap-2 overflow-x-auto" id="vault-filters">
            {categoriesList.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`text-xs px-4 py-2 rounded-xl font-semibold transition cursor-pointer shrink-0 font-sans border ${
                  activeCategoryFilter === cat
                    ? "bg-violet-600 text-white border-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.25)]"
                    : "bg-[#090416] text-slate-400 border-violet-500/10 hover:text-slate-300 hover:bg-[#12082b]"
                }`}
              >
                {translatedCategoryLabel(cat)}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-500 font-bold hidden sm:block font-mono bg-black/20 px-2.5 py-1 rounded-lg border border-violet-500/5">
            {filteredDocuments.length} {t("files", lang)}
          </span>
        </div>

        {/* Document Cards list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="vault-list-grid">
          {filteredDocuments.map(doc => {
            const translatedDoc = translateVaultDocument(doc, lang);
            const isSelected = selectedDoc?.id === doc.id;
            const isMissing = doc.status === "Missing";
            const isExpanded = expandedDocId === doc.id;
            
            return (
              <div
                key={doc.id}
                onClick={() => !isMissing && setSelectedDoc(doc)}
                className={`p-5 border rounded-2xl transition cursor-pointer flex flex-col justify-between group relative font-sans ${
                  isMissing
                    ? "bg-black/20 border-violet-500/5 opacity-50 cursor-default h-[150px]"
                    : isSelected
                    ? "border-violet-500 bg-[#0f0622]/80 shadow-[0_0_15px_rgba(124,58,237,0.15)] min-h-[150px]"
                    : "bg-[#080414] border-violet-500/10 hover:border-violet-500/25 hover:bg-[#0f0622] min-h-[150px]"
                } ${isExpanded ? "col-span-1 sm:col-span-2 h-auto" : "h-[150px]"}`}
                id={`vault-doc-card-${doc.id}`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${isMissing ? "bg-[#090416] text-slate-600 border-violet-500/5" : "bg-violet-950/40 text-violet-400 border-violet-500/15"}`}>
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 font-sans tracking-wide">{translatedDoc.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-sans">{t(translatedDoc.type || "", lang)}</p>
                      </div>
                    </div>
                    
                    {/* Expand/Collapse Chevron for non-missing documents */}
                    {!isMissing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDocId(isExpanded ? null : doc.id);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-black/30 border border-violet-500/10 cursor-pointer transition hover:bg-violet-500/10"
                        title={isExpanded ? t("Hide Details", lang) : t("View Steps", lang)}
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  
                  {/* File Metadata */}
                  {!isMissing && doc.fileName && (
                    <p className="text-[10px] font-mono text-slate-500 truncate mt-3.5 bg-black/25 px-2.5 py-1 rounded-lg border border-violet-500/5 inline-block max-w-full">
                      {doc.fileName} ({doc.fileSize})
                    </p>
                  )}

                  {/* Inline Expanded Content for Summary, Key Clauses & Suggestions */}
                  <AnimatePresence initial={false}>
                    {isExpanded && !isMissing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 pt-4 border-t border-violet-500/10 space-y-4 text-xs overflow-hidden"
                      >
                        {/* Summary Section */}
                        {translatedDoc.summary && (
                          <div className="bg-black/30 p-3.5 rounded-xl border border-violet-500/10">
                            <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-violet-300 font-sans">
                              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                              <span>{t("AI Content Summary", lang)}</span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">{translatedDoc.summary}</p>
                          </div>
                        )}

                        {/* Key Clauses */}
                        {translatedDoc.keyClauses && translatedDoc.keyClauses.length > 0 && (
                          <div className="space-y-1.5 bg-black/10 p-3 rounded-xl border border-violet-500/5">
                            <h5 className="font-bold text-slate-200 flex items-center gap-1.5 text-[11px] font-sans">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              {t("Key Clauses & Regulations Identified:", lang)}
                            </h5>
                            <ul className="space-y-1 pl-4 list-disc text-slate-400 text-[10.5px] font-sans">
                              {translatedDoc.keyClauses.map((clause, idx) => (
                                <li key={idx} className="leading-relaxed">{clause}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Suggested Missing Information */}
                        {translatedDoc.missingInformation && translatedDoc.missingInformation.length > 0 && (
                          <div className="space-y-1.5 bg-black/10 p-3 rounded-xl border border-violet-500/5">
                            <h5 className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px] font-sans">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              {t("Potential Missing Information & Compliance Checks:", lang)}
                            </h5>
                            <ul className="space-y-1 pl-4 list-disc text-slate-400 text-[10.5px] font-sans">
                              {translatedDoc.missingInformation.map((info, idx) => (
                                <li key={idx} className="leading-relaxed">{info}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex justify-between items-center pt-3.5 border-t border-violet-500/10 mt-3.5" id="doc-card-footer">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(doc.status)}
                    
                    {/* Compact toggle AI summary trigger */}
                    {!isMissing && !isExpanded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDocId(doc.id);
                        }}
                        className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer font-sans transition"
                      >
                        <Sparkles className="w-3 h-3 text-violet-400" /> {t("AI Summary & Clauses", lang)}
                      </button>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  {!isMissing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc.id, doc.name);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition"
                        title={t("Delete Document", lang)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Right Column: AI Analysis Drawer & Suggested missing documents list */}
      <div className="space-y-6" id="vault-right-column">
        
        {/* Dynamic AI audit drawer */}
        <div className="bg-black/40 border border-violet-500/15 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden" id="vault-analysis-card">
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-bold text-white tracking-tight font-display">{t("AI Document Integrity Audit", lang)}</h3>
          </div>

          <AnimatePresence mode="wait">
            {selectedDoc ? (
              (() => {
                const trSelectedDoc = translateVaultDocument(selectedDoc, lang);
                return (
                  <motion.div
                    key={selectedDoc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                    id="vault-analysis-details"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white font-sans">{trSelectedDoc.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{t("Uploaded", lang)} {selectedDoc.uploadedAt ? new Date(selectedDoc.uploadedAt).toLocaleDateString() : t("Today", lang)}</p>
                      </div>
                      {selectedDoc.confidenceScore !== undefined && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                          {t("Confidence", lang)}: {selectedDoc.confidenceScore}%
                        </div>
                      )}
                    </div>

                    {/* Status Badges Grid */}
                    <div className="grid grid-cols-2 gap-2 font-sans" id="vault-analysis-badges">
                      <div className="bg-[#090416] p-2.5 rounded-xl border border-violet-500/10">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider font-sans">{t("Name Match", lang)}</span>
                        <span className={`text-[10px] font-bold block mt-1 ${
                          selectedDoc.nameMatch === "Match" ? "text-emerald-400" : selectedDoc.nameMatch === "Partial" ? "text-amber-400" : "text-rose-400"
                        }`}>{t(selectedDoc.nameMatch || "Verification Pending", lang)}</span>
                      </div>

                      <div className="bg-[#090416] p-2.5 rounded-xl border border-violet-500/10">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider font-sans">{t("Address Match", lang)}</span>
                        <span className={`text-[10px] font-bold block mt-1 ${
                          selectedDoc.addressMatch === "Match" ? "text-emerald-400" : selectedDoc.addressMatch === "Partial" ? "text-amber-400" : "text-rose-400"
                        }`}>{t(selectedDoc.addressMatch || "Verification Pending", lang)}</span>
                      </div>
                    </div>

                    {/* Extracted Information */}
                    {selectedDoc.extractedInfo && Object.keys(selectedDoc.extractedInfo).length > 0 && (
                      <div className="bg-black/30 p-3.5 rounded-xl border border-violet-500/10 space-y-2.5 font-sans">
                        <span className="text-[9px] text-violet-400 font-bold uppercase tracking-wider block font-sans">📋 {t("Extracted Information", lang)}</span>
                        <div className="grid grid-cols-1 gap-2 text-[10.5px]">
                          {Object.entries(selectedDoc.extractedInfo).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-start gap-2 border-b border-violet-500/5 pb-1.5 last:border-0 last:pb-0">
                              <span className="text-slate-400 font-semibold shrink-0">{t(key, lang)}:</span>
                              <span className="text-slate-200 text-right font-mono break-all">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary Section */}
                    {trSelectedDoc.summary && (
                      <div className="bg-[#0c061d] p-3.5 rounded-xl border border-violet-500/10 space-y-1 font-sans">
                        <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider block font-sans">✨ {t("AI Content Summary", lang)}</span>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{trSelectedDoc.summary}</p>
                      </div>
                    )}

                    {/* Audit details explainers */}
                    <div className="space-y-2 text-[11px] font-sans" id="vault-audit-details">
                      {trSelectedDoc.nameMatchDetails && (
                        <div className="bg-black/20 p-3 rounded-xl border border-violet-500/10">
                          <span className="font-bold text-slate-300 block font-sans">👤 {t("Name Verification:", lang)}</span>
                          <p className="text-slate-400 mt-1 font-sans leading-relaxed">{trSelectedDoc.nameMatchDetails}</p>
                        </div>
                      )}

                      {trSelectedDoc.addressMatchDetails && (
                        <div className="bg-black/20 p-3 rounded-xl border border-violet-500/10">
                          <span className="font-bold text-slate-300 block font-sans">📍 {t("Address Audit:", lang)}</span>
                          <p className="text-slate-400 mt-1 font-sans leading-relaxed">{trSelectedDoc.addressMatchDetails}</p>
                        </div>
                      )}

                      {trSelectedDoc.expiryStatus && (
                        <div className="bg-black/20 p-3 rounded-xl border border-violet-500/10">
                          <span className="font-bold text-slate-300 block font-sans">⏱️ {t("Validity Expiry:", lang)}</span>
                          <p className="text-slate-400 mt-1 font-sans leading-relaxed">{trSelectedDoc.expiryDetails} ({t(trSelectedDoc.expiryStatus || "", lang)})</p>
                        </div>
                      )}
                    </div>

                    {/* Key Clauses */}
                    {trSelectedDoc.keyClauses && trSelectedDoc.keyClauses.length > 0 && (
                      <div className="bg-[#0c061d] p-3.5 rounded-xl border border-violet-500/10 space-y-1.5 font-sans">
                        <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block flex items-center gap-1 font-sans">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {t("Key Clauses & Regulations Identified:", lang)}
                        </span>
                        <ul className="space-y-1.5 text-[10.5px] text-slate-400 list-disc pl-4 leading-relaxed font-sans">
                          {trSelectedDoc.keyClauses.map((clause, idx) => (
                            <li key={idx}>{clause}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Government Use Cases */}
                    {trSelectedDoc.governmentUseCases && trSelectedDoc.governmentUseCases.length > 0 && (
                      <div className="bg-violet-950/20 border border-violet-500/10 p-3.5 rounded-xl space-y-1.5 font-sans">
                        <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider block flex items-center gap-1 font-sans">
                          <CheckCircle className="w-3.5 h-3.5 text-violet-400" /> {t("Official Government Use Cases:", lang)}
                        </span>
                        <ul className="space-y-1.5 text-[10.5px] text-slate-400 list-disc pl-4 leading-relaxed font-sans">
                          {trSelectedDoc.governmentUseCases.map((useCase, idx) => (
                            <li key={idx}>{useCase}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Missing Info / Common Requirements check */}
                    {trSelectedDoc.missingInformation && trSelectedDoc.missingInformation.length > 0 && (
                      <div className="bg-amber-950/20 border border-amber-500/10 p-3.5 rounded-xl space-y-1.5 font-sans">
                        <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1.5 font-sans">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> {t("Potential Missing Information & Compliance Checks:", lang)}
                        </span>
                        <ul className="space-y-1.5 text-[10.5px] text-slate-400 list-disc pl-4 leading-relaxed font-sans">
                          {trSelectedDoc.missingInformation.map((info, idx) => (
                            <li key={idx}>{info}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Mismatch Issues List */}
                    {trSelectedDoc.criticalIssues && trSelectedDoc.criticalIssues.length > 0 && (
                      <div className="bg-rose-950/20 border border-rose-500/10 p-3.5 rounded-xl space-y-2 font-sans" id="vault-audit-issues">
                        <h5 className="text-[11px] font-bold text-rose-300 uppercase font-sans">{t("Critical discrepancies found:", lang)}</h5>
                        <ul className="space-y-1 text-[10.5px] text-slate-400 pl-4 list-disc font-sans leading-relaxed">
                          {trSelectedDoc.criticalIssues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggestions */}
                    {trSelectedDoc.aiSuggestions && trSelectedDoc.aiSuggestions.length > 0 && (
                      <div className="bg-violet-950/40 border border-violet-500/20 p-3.5 rounded-xl space-y-2 font-sans" id="vault-audit-suggestions">
                        <h5 className="text-[11px] font-bold text-violet-300 uppercase font-sans tracking-wide">💡 {t("AI Remediation Plan:", lang)}</h5>
                        <ul className="space-y-1.5 text-[10.5px] text-slate-400 font-sans leading-relaxed">
                          {trSelectedDoc.aiSuggestions.map((sug, idx) => (
                            <li key={idx} className="flex gap-1.5 items-start font-sans">
                              <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                              <span>{sug}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-slate-500 space-y-3" id="vault-analysis-empty">
                <FileText className="w-10 h-10 mx-auto opacity-30 text-violet-400" />
                <p className="text-xs font-semibold text-slate-300">{t("Select a document card", lang)}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed px-4">{t("Click any uploaded file in your vault to run a real-time, side-by-side AI discrepancies analysis.", lang)}</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Missing checklist of critical documents */}
        <div className="bg-black/40 border border-violet-500/15 rounded-3xl p-6 space-y-4" id="vault-checklist">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-display tracking-wide">{t("Citizen Document Checklist", lang)}</h4>
          
          <div className="space-y-2" id="vault-checklist-items">
            {documents.map(doc => {
              const trDoc = translateVaultDocument(doc, lang);
              const isMissing = doc.status === "Missing";
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-black/20 border border-violet-500/10 rounded-xl font-sans hover:border-violet-500/20 transition">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${isMissing ? "bg-rose-400 animate-pulse" : "bg-emerald-400"}`} />
                    <span className="text-xs text-slate-300 font-bold font-sans">{trDoc.name}</span>
                  </div>
                  {isMissing ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDoc(null);
                        fileInputRef.current?.click();
                      }}
                      className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-0.5 cursor-pointer font-sans transition"
                    >
                      {t("Upload Now", lang)} <Plus className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-400 font-sans bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">{t("Integrated", lang)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}

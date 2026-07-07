import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body payload size limits to handle base64 image uploads for document vault and complaints
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy initializer for Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper: check if real key is configured
function hasRealApiKey(): boolean {
  return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
}

function cleanAndParseJSON(text: string): any {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\n/, "").replace(/\n```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

// Endpoint 1: Generate Action Plan based on Citizen Profile and Life Event
app.post("/api/gemini/action-plan", async (req, res) => {
  try {
    const { profile, event } = req.body;
    
    if (!profile || !event) {
      return res.status(400).json({ error: "Missing profile or life event parameter" });
    }

    if (!hasRealApiKey()) {
      // Fallback response if API key is not configured
      return res.json(getMockActionPlan(event, profile));
    }

    const ai = getGeminiClient();
    const prompt = `You are an expert Indian Government Civic Advisor. 
Create a detailed, personalized Government Action Plan (Civil Roadmap) for an Indian citizen experiencing the life event: "${event}".

Citizen Profile Details:
- Name: ${profile.name || "N/A"}
- Age: ${profile.age || "N/A"}
- Gender: ${profile.gender || "N/A"}
- State: ${profile.state || "N/A"}
- City: ${profile.city || "N/A"}
- Occupation: ${profile.occupation || "N/A"}
- Income Group: ${profile.income || "N/A"}
- Student: ${profile.isStudent ? "Yes" : "No"}
- Business Owner: ${profile.isBusinessOwner ? "Yes" : "No"}
- Farmer: ${profile.isFarmer ? "Yes" : "No"}
- Senior Citizen: ${profile.isSeniorCitizen ? "Yes" : "No"}
- Preferred Language: ${profile.preferredLanguage || "English"}
- Disability: ${profile.disability ? profile.disability : "None"}

Please design an actionable, sequential visual roadmap to guide them through this process. 
You must output a single JSON object. Ensure all fields are filled. Do not use placeholders. 
Provide highly practical and realistic timelines, Indian government offices, fees, and required documents.

CRITICAL INSTRUCTION: Since the citizen's preferred language is: ${profile.preferredLanguage || "English"}, 
you MUST write and translate ALL values (such as 'summary', 'title', 'description', 'documentsNeeded', 'timeRequired', 'office', 'estimatedFees', 'actionButtonLabel', and 'tips') in this preferred language. 
The JSON keys (e.g. "theme", "summary", "roadmap", "step", "title", "description", etc.) MUST remain strictly in English as defined in the schema below, but their text values must be in the preferred language.

JSON Schema format:
{
  "theme": "A CSS-tailwind color theme class like blue, emerald, amber, purple, rose, sky, violet, indigo",
  "summary": "A 2-3 sentence professional summary summarizing what they need to do for this event in India (written in ${profile.preferredLanguage || "English"}).",
  "roadmap": [
    {
      "step": 1,
      "title": "Short title of step (written in ${profile.preferredLanguage || "English"})",
      "description": "Elaborate explanation of what to do in this step in simple words (written in ${profile.preferredLanguage || "English"}).",
      "status": "pending",
      "documentsNeeded": ["Document A", "Document B"],
      "timeRequired": "Time required (written in ${profile.preferredLanguage || "English"}) (e.g., 2-3 days, 1 week)",
      "office": "Indian Government department/office/portal (written in ${profile.preferredLanguage || "English"}) (e.g., e-Mitra, Municipal Corp, Aadhaar Seva Kendra, GST Portal, Sarathi)",
      "estimatedFees": "Fees in INR (written in ${profile.preferredLanguage || "English"}) (e.g., ₹50, ₹1000, Free)",
      "actionButtonLabel": "Action button label (written in ${profile.preferredLanguage || "English"}) (e.g., Register on GST Portal, Book Appointment)"
    }
  ],
  "tips": [
    "Tip 1 in ${profile.preferredLanguage || "English"}",
    "Tip 2 in ${profile.preferredLanguage || "English"}"
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are Smart Bharat's core AI civic engine. Your purpose is to turn complex Indian bureaucracy into highly intuitive, friendly, step-by-step citizen roadmaps.",
      }
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    res.json(parsed);

  } catch (error: any) {
    console.error("Action Plan error:", error);
    try {
      console.log("Falling back to mock action plan...");
      const { profile, event } = req.body;
      return res.json(getMockActionPlan(event, profile));
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to generate action plan: " + error.message });
    }
  }
});

// Endpoint 1b: Intelligent Conversational Chat with Query Routing
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { query, profile, history } = req.body;
    
    if (!query || !profile) {
      return res.status(400).json({ error: "Missing query or profile" });
    }

    if (!hasRealApiKey()) {
      return res.json(getMockChatResponse(query, profile));
    }

    let historyContext = "";
    if (history && history.length > 0) {
      historyContext = "Here is the previous conversation history with this citizen for your context:\n" +
        history.slice(-6).map((h: any) => `${h.role === "user" ? "Citizen" : "Assistant"}: ${h.content}`).join("\n") +
        "\n\n";
    }

    const ai = getGeminiClient();
    
    const routerPrompt = `You are the central routing processor for Smart Bharat.
${historyContext}The user is asking this current query: "${query}".

Analyze the user's query and classify it into one of these three categories:
1. "CIVIC" - If the query is related to Indian public administration, government schemes, bureaucracy, rules, taxes, passports, driving licenses, birth certificates, municipal procedures, or civic life in India.
2. "WEBSITE" - If the query is about using or navigating this Smart Bharat platform itself (e.g. how to upload files in the Document Vault, how to file a complaint in Grievance Cell, how to update profile, how to log out, how to change languages, what tabs exist, etc.).
3. "GENERAL" - If the query is a general tech, programming, coding (React, TypeScript, CSS, Node, Python, etc.), productivity, science, academic, creative, or non-civic question.

Also, formulate a highly detailed, professional, and helpful response to the query tailored to their routing category and their profile:
- Profile Name: ${profile.name || "Citizen"}
- Preferred Language: ${profile.preferredLanguage || "English"}
- Resident of: ${profile.city || "N/A"}, ${profile.state || "N/A"}
- Occupation: ${profile.occupation || "N/A"}

CRITICAL LANGUAGE INSTRUCTION: Since the citizen's preferred language is: ${profile.preferredLanguage || "English"}, 
you MUST write and translate the 'response' field and any suggested action items in this preferred language. The 'explanation' field and keys MUST remain in English.

You must output a single JSON object conforming to this schema:
{
  "route": "CIVIC | WEBSITE | GENERAL",
  "explanation": "Provide a 1-sentence English explanation of why this query was routed to this category.",
  "response": "Your complete Markdown-formatted answer to the user's query, styled professionally (written in ${profile.preferredLanguage || "English"}). If the category is WEBSITE, describe the interactive features of Smart Bharat like the Document Vault, AI Scheme recommender, Grievance center with photo analyzer, or Profile page.",
  "suggestedActions": [
    "Suggested action item 1 in ${profile.preferredLanguage || "English"}",
    "Suggested action item 2 in ${profile.preferredLanguage || "English"}"
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: routerPrompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are Smart Bharat's multi-lingual conversational router and AI companion. You help citizens answer general coding/tech questions, website help requests, or deep national civic and scheme inquiries.",
      }
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    res.json(parsed);

  } catch (error: any) {
    console.error("Chat routing error:", error);
    try {
      console.log("Falling back to mock chat response...");
      const { query, profile } = req.body;
      return res.json(getMockChatResponse(query, profile));
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to process chat: " + error.message });
    }
  }
});

// Endpoint 1c: Welfare Scheme Document / Text Summarizer
app.post("/api/gemini/summarize-scheme", async (req, res) => {
  try {
    const { text, fileData, fileType, lang } = req.body;
    const targetLang = lang || "English";

    if (!text && !fileData) {
      return res.status(400).json({ error: "No scheme content or file provided" });
    }

    if (!hasRealApiKey()) {
      return res.json(getMockSchemeSummary(text, fileType, targetLang));
    }

    const ai = getGeminiClient();
    let contents: any[] = [];

    let prompt = `You are an expert Indian Government Welfare Consultant.
Analyze the provided scheme information and generate a highly structured, accurate, and easy-to-read summary.

Ensure the summary is fully translated into the requested language: ${targetLang}. All string values MUST be in ${targetLang}. The JSON keys must remain in English.

Your JSON output must match this schema:
{
  "schemeName": "Full name of the scheme",
  "category": "Target category (e.g., Education, Business, Healthcare, Agriculture, Social Security)",
  "benefits": ["Benefit detail 1", "Benefit detail 2"],
  "eligibility": ["Eligibility criterion 1", "Eligibility criterion 2"],
  "documentsNeeded": ["Required document 1", "Required document 2"],
  "deadlines": "Important dates, application deadlines, or approval timelines",
  "targetAudience": "Description of who this scheme is intended to help"
}`;

    if (text) {
      contents.push(`Here is the scheme text information:\n\n${text}\n\n${prompt}`);
    } else if (fileData && fileType) {
      const mimeType = fileType.includes("pdf") ? "application/pdf" : fileType;
      contents.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType
        }
      });
      contents.push(prompt);
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the Smart Bharat Welfare Scheme Summarizer. Your goal is to simplify, organize, and translate complex bureaucratic scheme guidelines into neat, actionable summaries.",
      }
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    res.json(parsed);

  } catch (error: any) {
    console.error("Scheme summarize error:", error);
    try {
      console.log("Falling back to mock scheme summary...");
      const { text, fileType, lang } = req.body;
      const targetLang = lang || "English";
      return res.json(getMockSchemeSummary(text || "", fileType, targetLang));
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to summarize scheme: " + error.message });
    }
  }
});

// Endpoint 1d: Side-by-Side Scheme Comparison
app.post("/api/gemini/compare-schemes", async (req, res) => {
  try {
    const { schemes, profile } = req.body;
    
    if (!schemes || !Array.isArray(schemes) || schemes.length < 2) {
      return res.status(400).json({ error: "At least two schemes are required for comparison" });
    }

    const targetLang = profile?.preferredLanguage || "English";

    if (!hasRealApiKey()) {
      // Mock comparison builder
      const mockComparison = schemes.map(s => {
        let benefits = s.benefits || "Direct financial assistance and support services.";
        let eligibility = s.eligibility || "Varies by household category and location.";
        let docs = s.documentsNeeded?.join(", ") || "Aadhaar Card, Address Proof, Category Certificate.";
        let time = "15-30 working days";
        let pros = ["High coverage", "Secure central backing"];
        let cons = ["Requires Aadhaar-linked mobile verification", "Documentation must be precise"];

        if (s.name.toLowerCase().includes("kaushal") || s.name.toLowerCase().includes("skill")) {
          benefits = "Free skill training, ₹3,000 allowance, placement assist.";
          eligibility = "Unemployed youth aged 15-45.";
          time = "7-10 days for approval";
          pros = ["No educational barrier", "Direct industry tie-ups", "Immediate certification"];
          cons = ["Training centers might not be nearby", "Attendance must be 80%+"];
        } else if (s.name.toLowerCase().includes("mudra") || s.name.toLowerCase().includes("loan")) {
          benefits = "Collateral-free business loans up to ₹10 Lakhs.";
          eligibility = "Small business owners, micro-entrepreneurs.";
          time = "2-3 weeks";
          pros = ["No collateral needed", "Low interest rates", "Flexible repayment terms"];
          cons = ["Subject to strict credit check", "Requires comprehensive business project report"];
        } else if (s.name.toLowerCase().includes("ayushman") || s.name.toLowerCase().includes("health")) {
          benefits = "₹5 Lakh family healthcare insurance per year.";
          eligibility = "Socio-economically backward families under SECC list.";
          time = "Instant registration";
          pros = ["100% cashless treatment", "Covers pre-existing diseases", "Over 20,000 empanelled hospitals"];
          cons = ["Limited only to SECC listed cardholders", "Sometimes hospital beds are full"];
        }

        return {
          id: s.id,
          name: s.name,
          benefits,
          eligibility,
          documents: docs,
          time,
          pros,
          cons
        };
      });

      return res.json({
        comparison: mockComparison,
        recommendation: `Based on your profile as a ${profile?.age || "active"}-year-old resident of ${profile?.city || "your city"}, ${profile?.state || "India"} working as an ${profile?.occupation || "active citizen"}, we highly recommend focusing on **${schemes[0].name}** first as it offers direct benefits suited to your registered category, followed by **${schemes[1].name}** to fulfill supplemental development needs.`
      });
    }

    const ai = getGeminiClient();
    
    const prompt = `You are an elite Indian Government Welfare Scheme Analyst and Advisor.
Analyze these ${schemes.length} schemes to create a side-by-side comparison report:
${schemes.map((s, idx) => `Scheme ${idx+1}: "${s.name}" (Description: ${s.description}, Benefits: ${s.benefits}, Eligibility: ${s.eligibility})`).join("\n\n")}

Tailor the final 'recommendation' to this citizen's profile:
- Name: ${profile?.name || "Citizen"}
- Age: ${profile?.age || "N/A"}
- State: ${profile?.state || "N/A"}
- Occupation: ${profile?.occupation || "N/A"}

CRITICAL LANGUAGE REQUIREMENT: Since the citizen's preferred language is ${targetLang}, you MUST translate all descriptive values (such as 'benefits', 'eligibility', 'documents', 'time', 'pros', 'cons', and 'recommendation') to ${targetLang}. The JSON keys must remain in English.

Your JSON output MUST match this schema:
{
  "comparison": [
    {
      "id": "Matching scheme id from input",
      "name": "Scheme name",
      "benefits": "Short summary of benefits (translated to ${targetLang})",
      "eligibility": "Short summary of eligibility (translated to ${targetLang})",
      "documents": "Comma-separated required documents (translated to ${targetLang})",
      "time": "Standard processing or approval time (translated to ${targetLang})",
      "pros": ["Pro 1 (translated to ${targetLang})", "Pro 2 (translated to ${targetLang})"],
      "cons": ["Con 1 (translated to ${targetLang})", "Con 2 (translated to ${targetLang})"]
    }
  ],
  "recommendation": "A highly customized, comprehensive recommendation explaining which scheme is the best fit for this user and what their immediate next steps should be (written in ${targetLang})."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the Smart Bharat Welfare Scheme Comparison Advisor. You analyze multiple Indian policies side-by-side to deliver objective, clear guidance.",
      }
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    res.json(parsed);

  } catch (error: any) {
    console.error("Comparison error:", error);
    try {
      console.log("Falling back to mock comparison...");
      const { schemes, profile } = req.body;
      const mockComparison = schemes.map((s: any) => {
        let benefits = s.benefits || "Direct financial assistance and support services.";
        let eligibility = s.eligibility || "Varies by household category and location.";
        let docs = s.documentsNeeded?.join(", ") || "Aadhaar Card, Address Proof, Category Certificate.";
        let time = "15-30 working days";
        let pros = ["High coverage", "Secure central backing"];
        let cons = ["Requires Aadhaar-linked mobile verification", "Documentation must be precise"];

        if (s.name.toLowerCase().includes("kaushal") || s.name.toLowerCase().includes("skill")) {
          benefits = "Free skill training, ₹3,000 allowance, placement assist.";
          eligibility = "Unemployed youth aged 15-45.";
          time = "7-10 days for approval";
          pros = ["No educational barrier", "Direct industry tie-ups", "Immediate certification"];
          cons = ["Training centers might not be nearby", "Attendance must be 80%+"];
        } else if (s.name.toLowerCase().includes("mudra") || s.name.toLowerCase().includes("loan")) {
          benefits = "Collateral-free business loans up to ₹10 Lakhs.";
          eligibility = "Small business owners, micro-entrepreneurs.";
          time = "2-3 weeks";
          pros = ["No collateral needed", "Low interest rates", "Flexible repayment terms"];
          cons = ["Subject to strict credit check", "Requires comprehensive business project report"];
        } else if (s.name.toLowerCase().includes("ayushman") || s.name.toLowerCase().includes("health")) {
          benefits = "₹5 Lakh family healthcare insurance per year.";
          eligibility = "Socio-economically backward families under SECC list.";
          time = "Instant registration";
          pros = ["100% cashless treatment", "Covers pre-existing diseases", "Over 20,000 empanelled hospitals"];
          cons = ["Limited only to SECC listed cardholders", "Sometimes hospital beds are full"];
        }

        return {
          id: s.id,
          name: s.name,
          benefits,
          eligibility,
          documents: docs,
          time,
          pros,
          cons
        };
      });

      return res.json({
        comparison: mockComparison,
        recommendation: `Based on your profile as a ${profile?.age || "active"}-year-old resident of ${profile?.city || "your city"}, ${profile?.state || "India"} working as an ${profile?.occupation || "active citizen"}, we highly recommend focusing on **${schemes[0].name}** first as it offers direct benefits suited to your registered category, followed by **${schemes[1].name}** to fulfill supplemental development needs.`
      });
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to compare schemes: " + error.message });
    }
  }
});

// Endpoint 2: Recommend Schemes based on Profile
app.post("/api/gemini/schemes", async (req, res) => {
  try {
    const { profile } = req.body;
    
    if (!profile) {
      return res.status(400).json({ error: "Missing profile parameters" });
    }

    if (!hasRealApiKey()) {
      return res.json(getMockSchemes(profile));
    }

    const ai = getGeminiClient();
    const prompt = `You are an Indian Welfare Schemes AI Expert. Analyze this citizen profile and recommend exactly 3 highly eligible and beneficial Indian Government Schemes (Central or state schemes matching their location: ${profile.state || "India"}).

Citizen Profile:
- Name: ${profile.name || "Citizen"}
- Age: ${profile.age}
- Gender: ${profile.gender}
- State: ${profile.state}
- City: ${profile.city}
- Occupation: ${profile.occupation}
- Annual Income: ${profile.income}
- Student: ${profile.isStudent ? "Yes" : "No"}
- Business Owner: ${profile.isBusinessOwner ? "Yes" : "No"}
- Farmer: ${profile.isFarmer ? "Yes" : "No"}
- Senior Citizen: ${profile.isSeniorCitizen ? "Yes" : "No"}
- Disability: ${profile.disability || "None"}
- Preferred Language: ${profile.preferredLanguage || "English"}

Generate a JSON array containing exactly 3 recommended scheme objects.

CRITICAL INSTRUCTION: Since the citizen's preferred language is: ${profile.preferredLanguage || "English"}, 
you MUST write and translate ALL values (such as 'name', 'category', 'eligibility', 'benefits', 'whyRecommended', 'documentsNeeded', and 'estimatedApprovalTime') in this preferred language. 
The JSON keys (e.g. "id", "name", "category", etc.) MUST remain strictly in English, but their values must be in the preferred language.

JSON format expected:
[
  {
    "id": "scheme-id-slug",
    "name": "Full official name of the scheme (written in ${profile.preferredLanguage || "English"}) (e.g., PM-KISAN, PM Mudra Yojana, Post-Matric Scholarship)",
    "category": "e.g., Business, Agriculture, Education, Welfare, Healthcare (written in ${profile.preferredLanguage || "English"})",
    "eligibility": "Clear bulleted summary of eligibility criteria (written in ${profile.preferredLanguage || "English"})",
    "benefits": "Clear, detailed benefits (e.g., ₹6000/year, up to ₹10 Lakh collateral-free loan) (written in ${profile.preferredLanguage || "English"})",
    "whyRecommended": "Personalized 2-sentence explanation of why this matches their specific profile (written in ${profile.preferredLanguage || "English"})",
    "documentsNeeded": ["Aadhaar", "PAN", "Income Certificate"],
    "estimatedApprovalTime": "Estimated approval timeline (written in ${profile.preferredLanguage || "English"}) (e.g., 15-30 days)"
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the Smart Bharat Welfare Finder. You specialize in matching Indian citizens with life-changing schemes like Ayushman Bharat, Mudra, PM-KISAN, Scholarships, etc.",
      }
    });

    const parsed = cleanAndParseJSON(response.text || "[]");
    res.json(parsed);

  } catch (error: any) {
    console.error("Schemes recommendation error:", error);
    try {
      console.log("Falling back to mock recommended schemes...");
      const { profile } = req.body;
      return res.json(getMockSchemes(profile));
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to generate schemes: " + error.message });
    }
  }
});

// Endpoint 3: Multimodal Document Vault Analysis
const handleDocumentAnalysis = async (req: express.Request, res: express.Response) => {
  try {
    const { docType, fileName, base64Data, fileData, profile } = req.body;
    const documentBase64 = base64Data || fileData;
    
    if (!docType || !profile) {
      return res.status(400).json({ error: "Missing docType or profile" });
    }

    if (!documentBase64 || !hasRealApiKey()) {
      // If no file uploaded or mock mode, return smart mock response tailored to the document and user
      return res.json(getMockDocAnalysis(docType, fileName || "document.jpg", profile));
    }

    const ai = getGeminiClient();
    
    // Split mime type and base64
    const matches = documentBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
    let mimeType = "image/jpeg";
    let pureBase64 = documentBase64;
    
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      pureBase64 = matches[2];
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: pureBase64,
      }
    };

    const textPrompt = {
      text: `Analyze this Indian official document of type "${docType}" (User named the file: "${fileName}").
Cross-reference this document's visual content with the citizen's registered profile:
- Profile Name: ${profile.name || "N/A"}
- Profile Gender: ${profile.gender || "N/A"}
- Profile State: ${profile.state || "N/A"}
- Profile City: ${profile.city || "N/A"}
- Profile Age/Birth: ${profile.age || "N/A"}

Please perform a rigorous visual audit of the document:
1. Identify if it appears to be a valid, real document and detect what type of document it actually is (Aadhaar, PAN, Passport, Driving Licence, Voter ID, Birth Certificate, Marksheet, etc.).
2. Check for "Name Mismatch" (does the name on the document match "${profile.name}"?).
3. Check for "Address Mismatch" (does the state/city match "${profile.state}, ${profile.city}"?).
4. Check for Expiration (does it have an expiry date that is soon or expired?).
5. Identify any missing parts or poor quality (e.g., blurry, crop issues).
6. Summarize the content of the document, identify key clauses or statutory provisions/terms of use mentioned, and list potential missing information based on standard Indian government document requirements.
7. List at least 3-4 specific Indian government use cases / services where this document can be used.
8. Suggest other supporting documents that might be required to complete common citizen applications alongside this one.
9. Extract all visible key-value pairs (like Name, Document Number, Date of Birth, Address, Date of Issue, etc.).

CRITICAL INSTRUCTION: Since the citizen's preferred language is: ${profile.preferredLanguage || "English"}, 
you MUST write and translate ALL descriptive and details values (such as 'nameMatchDetails', 'addressMatchDetails', 'expiryDetails', 'criticalIssues', 'aiSuggestions', 'summary', 'keyClauses', 'governmentUseCases', and 'missingInformation') in this preferred language. 
The JSON keys MUST remain strictly in English, but their values must be in the preferred language.

Provide a single JSON response conforming to this structure:
{
  "status": "Verified | Warning | Action Needed",
  "nameMatch": "Match | Mismatch | Partial",
  "nameMatchDetails": "Explain what name was found vs profile (written in ${profile.preferredLanguage || "English"})",
  "addressMatch": "Match | Mismatch | Partial",
  "addressMatchDetails": "Explain what address was found vs profile (written in ${profile.preferredLanguage || "English"})",
  "expiryStatus": "Valid | Expiring Soon | Expired | Non-Expiring",
  "expiryDetails": "Expiry details or N/A (written in ${profile.preferredLanguage || "English"})",
  "criticalIssues": [
    "Issue in ${profile.preferredLanguage || "English"}",
    "Issue in ${profile.preferredLanguage || "English"}"
  ],
  "aiSuggestions": [
    "Suggestion in ${profile.preferredLanguage || "English"}",
    "Suggestion in ${profile.preferredLanguage || "English"}"
  ],
  "summary": "A concise, elegant paragraph summarizing the document's content, purpose, and visual confirmation status (written in ${profile.preferredLanguage || "English"}).",
  "keyClauses": [
    "Clause in ${profile.preferredLanguage || "English"}",
    "Clause in ${profile.preferredLanguage || "English"}"
  ],
  "missingInformation": [
    "Missing detail in ${profile.preferredLanguage || "English"}",
    "Missing detail in ${profile.preferredLanguage || "English"}"
  ],
  "detectedDocType": "The identified document type (e.g., Aadhaar Card, PAN Card, Indian Passport, Driving Licence, Voter ID, Birth Certificate)",
  "confidenceScore": 95, // Confidence score (integer between 50 and 100)
  "extractedInfo": {
    "Document Number": "...",
    "Name": "...",
    "DOB": "...",
    "Address": "..."
  },
  "governmentUseCases": [
    "Use case 1 in ${profile.preferredLanguage || "English"}",
    "Use case 2 in ${profile.preferredLanguage || "English"}"
  ],
  "isRealAnalysis": true
}`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPrompt] },
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an AI Document Verifier. You verify Indian identity proofs like Aadhaar, PAN, Voter ID, Driver License, Passports, and marksheets.",
      }
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    res.json(parsed);

  } catch (error: any) {
    console.error("Document analysis error:", error);
    try {
      console.log("Falling back to mock document analysis...");
      const { docType, fileName, profile } = req.body;
      return res.json(getMockDocAnalysis(docType, fileName || "document.jpg", profile));
    } catch (fallbackError) {
      res.status(500).json({ error: "Document verification failed: " + error.message });
    }
  }
};

app.post("/api/gemini/analyze-document", handleDocumentAnalysis);
app.post("/api/gemini/audit-document", handleDocumentAnalysis);

// Endpoint 4: Multimodal Complaint Reporter
app.post("/api/gemini/generate-complaint", async (req, res) => {
  try {
    const { category, description, location, base64Image, profile } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    if (!base64Image || !hasRealApiKey()) {
      // Mock generation of complaint report
      return res.json(getMockComplaint(category, description || "No detailed description", location || "Ward 12, Local Municipal Corporation"));
    }

    const ai = getGeminiClient();
    const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
    let mimeType = "image/jpeg";
    let pureBase64 = base64Image;
    
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      pureBase64 = matches[2];
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: pureBase64,
      }
    };

    const preferredLang = profile?.preferredLanguage || "English";

    const textPrompt = {
      text: `You are an AI Civic Grievance officer in India. 
Look closely at this image uploaded by a citizen regarding a civic grievance of category "${category}".
Additional details provided by user: "${description || "None"}"
Location specified: "${location || "Demo Location"}"

Your task is to:
1. Verify what is depicted in the image (e.g. identify pothole, trash dump, broken light, water leak, etc.).
2. Determine the correct municipal or state government department responsible for solving this issue in India (e.g., Municipal Corporation Road Works Department, Sanitation Dept, Electricity Board, Jal Board).
3. Assign a realistic civic priority (Critical, High, Medium, Low).
4. Draft a formal, highly effective grievance complaint letter/description that will be automatically submitted to the portal. Highlight the hazard level.

CRITICAL INSTRUCTION: Since the citizen's preferred language is: ${preferredLang}, 
you MUST write and translate ALL descriptive fields (such as 'identifiedIssue', 'suggestedTitle', and 'complaintText') in this preferred language. 
The JSON keys MUST remain strictly in English, but their values must be in the preferred language.

Generate a JSON response conforming to this structure:
{
  "identifiedIssue": "Brief summary of what you see in the photo (written in ${preferredLang}) (e.g., Pothole of approximately 2 feet deep near a pedestrian crossing)",
  "department": "Name of the government department (e.g., PWD - Road Engineering, Swachh Bharat Cell, State Electricity Board, City Water Board)",
  "priority": "Critical | High | Medium | Low",
  "suggestedTitle": "Short catchy title (written in ${preferredLang}) (e.g., Major Hazardous Pothole on Sector 5 Main Road)",
  "complaintText": "The complete formal complaint text ready for filing (written in ${preferredLang}).",
  "departmentContactName": "Designation of Officer (e.g., Ward Commissioner, Executive Engineer PWD)",
  "estimatedSLA": "Timeline for resolution (e.g., 48 hours, 3 working days)",
  "trackingId": "Generate a beautiful mock ticket number like SB-COMP-2026-XXXX",
  "isRealImageAnalysis": true
}`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPrompt] },
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are the Smart Bharat Civic Grievance AI. You turn citizen complaints and visual proof into official, high-impact grievance filings that get government attention.",
      }
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    res.json(parsed);

  } catch (error: any) {
    console.error("Complaint generation error:", error);
    try {
      console.log("Falling back to mock complaint...");
      const { category, description, location } = req.body;
      return res.json(getMockComplaint(category, description || "No detailed description", location || "Ward 12, Local Municipal Corporation"));
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to generate grievance: " + error.message });
    }
  }
});

// --- Mock Engines for Offline/Placeholder Modes ---

function getMockActionPlan(event: string, profile: any) {
  const name = profile.name || "Citizen";
  const state = profile.state || "Delhi";
  
  if (event.toLowerCase().includes("business") || event.toLowerCase().includes("msme")) {
    return {
      theme: "indigo",
      summary: `Congratulations on choosing to start a business, ${name}! In India, starting a business has been highly streamlined via the SPICe+ form for companies and Udyam Portal for micro, small, and medium enterprises (MSMEs). Based in ${state}, here is your step-by-step launch roadmap:`,
      roadmap: [
        {
          step: 1,
          title: "Obtain PAN & Aadhaar Linking",
          description: "Ensure your Aadhaar is linked to your active mobile number for digital OTP verifications.",
          status: "completed",
          documentsNeeded: ["Aadhaar Card", "Mobile number"],
          timeRequired: "Instant",
          office: "UIDAI Portal / Income Tax Dept",
          estimatedFees: "Free",
          actionButtonLabel: "Check Aadhaar Status"
        },
        {
          step: 2,
          title: "Register for Udyam MSME Registration",
          description: "This registration gives you collateral-free loans, interest rate subsidies, and protection against delayed payments.",
          status: "pending",
          documentsNeeded: ["PAN Card", "Aadhaar Card", "Bank Account Details"],
          timeRequired: "1-2 days",
          office: "Ministry of MSME (Udyam Registration Portal)",
          estimatedFees: "Free",
          actionButtonLabel: "Apply on Udyam Portal"
        },
        {
          step: 3,
          title: "Apply for GSTIN (GST Registration)",
          description: "Mandatory if your annual turnover exceeds ₹40 Lakhs (goods) or ₹20 Lakhs (services), or for inter-state business.",
          status: "pending",
          documentsNeeded: ["PAN", "Business Address Proof (Rent deed/Electricity Bill)", "NOC from Owner"],
          timeRequired: "3-7 days",
          office: "GST Common Portal (gst.gov.in)",
          estimatedFees: "Free (Govt fee)",
          actionButtonLabel: "Register on GSTIN"
        },
        {
          step: 4,
          title: "Open a Bank Current Account",
          description: "Establish a distinct bank account in the name of your business using your MSME and GSTIN certificates.",
          status: "pending",
          documentsNeeded: ["Udyam Certificate", "GST Registration", "PAN", "Rent Agreement"],
          timeRequired: "2-3 days",
          office: "Any Commercial Bank (SBI, HDFC, ICICI)",
          estimatedFees: "Varies (Average ₹5000 initial deposit)",
          actionButtonLabel: "Compare Business Accounts"
        },
        {
          step: 5,
          title: "Apply for PM Mudra Loan (Shishu Category)",
          description: "Avail up to ₹50,000 for initial working capital and machinery without any collateral under the Pradhan Mantri Mudra Yojana.",
          status: "pending",
          documentsNeeded: ["Udyam Certificate", "Current Bank Statement", "Business Plan", "Address Proof"],
          timeRequired: "10-15 days",
          office: "Udyami Mitra Portal / Selected Local Bank",
          estimatedFees: "No processing fees",
          actionButtonLabel: "Apply Mudra Scheme"
        }
      ],
      tips: [
        "Link your Aadhaar to your business-connected bank account to receive direct subsidy transfers.",
        "File your GST nil-returns monthly even if no sales occur initially, to maintain high compliance scores."
      ]
    };
  } else if (event.toLowerCase().includes("marry") || event.toLowerCase().includes("married")) {
    return {
      theme: "rose",
      summary: `Warmest congratulations on your marriage, ${name}! Registering your marriage is legally mandatory in India and extremely helpful for passport updates, joint banking, and visas. In ${state}, this is handled under either the Hindu Marriage Act or Special Marriage Act.`,
      roadmap: [
        {
          step: 1,
          title: "Check Age & Witness Requirements",
          description: "Bride must be 18+ and Groom 21+. You will need 3 witnesses with active government identity cards.",
          status: "completed",
          documentsNeeded: ["Age Proof (10th Marksheet/Birth Certificate)", "Address proof"],
          timeRequired: "1 day",
          office: "Local Registrar of Marriage Office",
          estimatedFees: "Free",
          actionButtonLabel: "Verify Age Proofs"
        },
        {
          step: 2,
          title: "Submit Online Application & Select Slot",
          description: "Fill the marriage registration portal for ${state}, upload wedding photos and card, and book a physical slot with the Sub-Divisional Magistrate.",
          status: "pending",
          documentsNeeded: ["Wedding Card", "Marriage Photograph", "Passport size photos", "Affidavits of marriage"],
          timeRequired: "2-3 days",
          office: "Revenue Dept Portal of ${state}",
          estimatedFees: "₹100 - ₹200",
          actionButtonLabel: "Fill Application Online"
        },
        {
          step: 3,
          title: "Physical Hearing at SDM / Registrar Office",
          description: "Husband, wife, and the 3 witnesses must physically visit the selected registrar office with all original documents for verification.",
          status: "pending",
          documentsNeeded: ["Original Documents", "Witness ID cards", "Witness residency proofs"],
          timeRequired: "1 day (Appointment)",
          office: "Local SDM Office",
          estimatedFees: "None",
          actionButtonLabel: "Check SDM Location"
        },
        {
          step: 4,
          title: "Download Marriage Certificate",
          description: "Once verified, your digital marriage certificate is generated and can be downloaded or pushed to your DigiLocker locker directly.",
          status: "pending",
          documentsNeeded: ["Application ID"],
          timeRequired: "3-5 days after hearing",
          office: "DigiLocker / State Portal",
          estimatedFees: "Free",
          actionButtonLabel: "Access DigiLocker"
        }
      ],
      tips: [
        "Ensure your names on the marriage card match your official identification cards exactly.",
        "Add your spouse's name to your Aadhaar card using this marriage certificate to simplify future joint filings."
      ]
    };
  } else if (event.toLowerCase().includes("passport")) {
    return {
      theme: "blue",
      summary: `Starting your passport application, ${name}! The Ministry of External Affairs has made this process incredibly digital and rapid through the 'Passport Seva' platform. Here is your roadmap:`,
      roadmap: [
        {
          step: 1,
          title: "Register on Passport Seva Portal",
          description: "Create an account on the official Passport Seva portal and complete the online passport application form.",
          status: "completed",
          documentsNeeded: ["Aadhaar Card", "Mobile Number"],
          timeRequired: "1 hour",
          office: "Passport Seva Portal (passportindia.gov.in)",
          estimatedFees: "Free Registration",
          actionButtonLabel: "Register on Passport Seva"
        },
        {
          step: 2,
          title: "Pay Fee & Schedule PSK Appointment",
          description: "Pay the official application fee online to schedule an appointment at your closest Passport Seva Kendra (PSK) or Post Office Passport Seva Kendra (POPSK).",
          status: "pending",
          documentsNeeded: ["Online Application Reference Number (ARN)"],
          timeRequired: "Appointment in 3-10 days",
          office: "Passport Seva Kendra Online Payment System",
          estimatedFees: "₹1500 (Normal) / ₹2000 (Tatkaal)",
          actionButtonLabel: "Book PSK Appointment Slot"
        },
        {
          step: 3,
          title: "Document Verification at PSK",
          description: "Visit the PSK. Your biometric data (fingerprints & iris scans) will be captured, and original documents verified by officers.",
          status: "pending",
          documentsNeeded: ["Original Aadhaar Card", "10th Marksheet (for ECNR status)", "Address Proof (Bank statement/Rent Deed)", "ARN Printout"],
          timeRequired: "2-4 hours at the center",
          office: "Nearest PSK / POPSK Office",
          estimatedFees: "None (Paid Online)",
          actionButtonLabel: "Check PSK Checklist"
        },
        {
          step: 4,
          title: "Police Verification",
          description: "A local police officer from your station will visit your address or call you to verify your residency and criminal history.",
          status: "pending",
          documentsNeeded: ["Two neighbour witness signatures", "Copies of Aadhaar & Rent agreement"],
          timeRequired: "7-15 days",
          office: "Local Police Station under ${state} Police",
          estimatedFees: "Free (Legally, do not pay bribes)",
          actionButtonLabel: "Track Police Verification"
        },
        {
          step: 5,
          title: "Passport Dispatch & Delivery",
          description: "After successful police clearance, your passport is printed and dispatched via Speed Post directly to your address.",
          status: "pending",
          documentsNeeded: ["Tracking Number"],
          timeRequired: "5-7 days after police clearance",
          office: "India Post Speed Post Tracker",
          estimatedFees: "Free",
          actionButtonLabel: "Track Speed Post Delivery"
        }
      ],
      tips: [
        "Check your Non-ECR status qualification. If you have passed 10th grade, you do not need emigration checks.",
        "Do not laminate your marksheets or original certificates, as officers need to inspect them directly."
      ]
    };
  } else {
    // Default action plan: Had a Baby / Moved city / Lost docs / driving licence / etc.
    return {
      theme: "emerald",
      summary: `Getting started with your personalized action plan for: "${event}". Smart Bharat has analyzed your profile and generated the optimal digital-first path:`,
      roadmap: [
        {
          step: 1,
          title: "Aadhaar and Identity Alignment",
          description: "Verify that your primary identity proof (Aadhaar Card) is correct and linked to your current phone number.",
          status: "completed",
          documentsNeeded: ["Aadhaar", "Mobile Number"],
          timeRequired: "Instant",
          office: "UIDAI Portal",
          estimatedFees: "Free",
          actionButtonLabel: "Verify Aadhaar Details"
        },
        {
          step: 2,
          title: "Submit Digital Request via State e-Portal",
          description: "Locate and register on the central UMANG app or state e-District portal for this service to bypass long offline queues.",
          status: "pending",
          documentsNeeded: ["Aadhaar", "PAN", "Self-Declaration Affidavit"],
          timeRequired: "3-5 days",
          office: "UMANG Mobile App / State e-District Portal",
          estimatedFees: "₹30 - ₹100",
          actionButtonLabel: "Access e-District Portal"
        },
        {
          step: 3,
          title: "Physical Biometrics or Verification Slot",
          description: "Many Indian government services require one-time biometric verification or offline slot check for audits.",
          status: "pending",
          documentsNeeded: ["Original supporting proofs", "Application printout"],
          timeRequired: "1 day",
          office: "Local Tehsil / Municipal Ward Office / Citizen Center",
          estimatedFees: "None",
          actionButtonLabel: "Locate Closest Center"
        },
        {
          step: 4,
          title: "Approval & DigiLocker Delivery",
          description: "Monitor status. Once the authority signs your certificate/license digitally, it gets pushed instantly to DigiLocker.",
          status: "pending",
          documentsNeeded: ["Application Reference Number"],
          timeRequired: "5-10 days",
          office: "DigiLocker System",
          estimatedFees: "Free",
          actionButtonLabel: "Fetch from DigiLocker"
        }
      ],
      tips: [
        "Use your digital signature or e-Sign with Aadhaar OTP to sign declarations paperlessly.",
        "Always download a signed PDF copy rather than a scanned crop for better validity."
      ]
    };
  }
}

function getMockSchemes(profile: any) {
  const schemes = [];
  
  if (profile.isStudent) {
    schemes.push({
      id: "post-matric-scholarship",
      name: "National Post-Matric Scholarship Scheme",
      category: "Education",
      eligibility: "Indian students enrolled in 11th grade, college, or university. Family annual income less than ₹2.5 Lakhs.",
      benefits: "100% tuition fee reimbursement and a monthly maintenance allowance up to ₹1,200.",
      whyRecommended: `Recommended because you are a Student with an income bracket of ${profile.income || "low-to-middle income"}. This scheme will support your studies in ${profile.state || "your state"}.`,
      documentsNeeded: ["Income Certificate", "Caste Certificate (if applicable)", "Previous Year Marksheet", "Fee Receipt", "Aadhaar"],
      estimatedApprovalTime: "30-45 days"
    });
  }
  
  if (profile.isBusinessOwner || profile.occupation === "Business" || profile.occupation === "Self-employed") {
    schemes.push({
      id: "pm-mudra-yojana",
      name: "Pradhan Mantri Mudra Yojana (PMMY)",
      category: "Business",
      eligibility: "Non-corporate, non-farm small/micro enterprises. Loan category: Shishu (up to ₹50k), Kishor (up to ₹5L), Tarun (up to ₹10L).",
      benefits: "Collateral-free business development loans up to ₹10 Lakhs with lower interest rates.",
      whyRecommended: `As a Business Owner, this scheme provides immediate collateral-free capital from government banks to expand your enterprise.`,
      documentsNeeded: ["Udyam MSME Registration", "Business Pitch/Plan", "Identity Proof", "Address Proof", "PAN Card"],
      estimatedApprovalTime: "15-20 days"
    });
  }

  if (profile.isFarmer || profile.occupation === "Farmer" || profile.occupation === "Agriculture") {
    schemes.push({
      id: "pm-kisan-yojana",
      name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
      category: "Agriculture",
      eligibility: "All small and marginal landholding farmer families across India, subject to land records ownership.",
      benefits: "Direct cash benefit of ₹6,000 per year transferred in three equal installments of ₹2,000 directly into bank accounts.",
      whyRecommended: `As a registered farmer based in ${profile.state || "your state"}, you qualify for quarterly income support directly into your bank account.`,
      documentsNeeded: ["Land Ownership Documents (Khata/Khasra)", "Aadhaar Card", "Bank Passbook", "Mobile Number linked Aadhaar"],
      estimatedApprovalTime: "15-30 days"
    });
  }

  // General Schemes if count is less than 3
  if (schemes.length < 3) {
    schemes.push({
      id: "ayushman-bharat-pjan",
      name: "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
      category: "Healthcare",
      eligibility: "Families categorized under low-income rural households and designated urban worker categories based on SECC 2011 database.",
      benefits: "Cashless healthcare coverage of up to ₹5,000,000 per family per year for secondary and tertiary hospitalization care.",
      whyRecommended: `Ensuring robust health security is critical. Based on your profile, your family qualifies for cash-free treatments across 20,000+ empaneled hospitals.`,
      documentsNeeded: ["Aadhaar Card", "Ration Card", "PM-JAY Letter/Card", "Mobile Number"],
      estimatedApprovalTime: "7-10 days"
    });
  }

  if (schemes.length < 3) {
    schemes.push({
      id: "pm-svanidhi",
      name: "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)",
      category: "Business",
      eligibility: "Urban/rural street vendors who were vending on or before March 24, 2020.",
      benefits: "Working capital loan of up to ₹10,000 (1st tranche), ₹20,000 (2nd tranche) at highly subsidized interest rates.",
      whyRecommended: `This provides collateral-free low-cost working capital to support micro-independent occupations.`,
      documentsNeeded: ["Vending Certificate", "Aadhaar Card", "PAN", "Voter ID"],
      estimatedApprovalTime: "7 days"
    });
  }

  if (schemes.length < 3) {
    schemes.push({
      id: "pmsby-insurance",
      name: "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
      category: "Social Security",
      eligibility: "All savings bank account holders aged 18 to 70 years.",
      benefits: "Accidental death and full disability coverage of ₹2 Lakhs at an annual premium of just ₹20 auto-debited.",
      whyRecommended: `Highly recommended, highly cost-effective premium social security cover for ${profile.name || "every citizen"} in India.`,
      documentsNeeded: ["Savings Bank Account Details", "Aadhaar Card", "Consent Form"],
      estimatedApprovalTime: "1-2 days"
    });
  }

  return schemes.slice(0, 3);
}

function getMockDocAnalysis(docType: string, fileName: string, profile: any) {
  const docLower = docType.toLowerCase();
  const userName = profile.name || "Citizen";
  
  if (docLower.includes("aadhaar")) {
    return {
      status: "Verified",
      nameMatch: "Match",
      nameMatchDetails: `The name found on the document ('${userName.toUpperCase()}') matches your civic profile perfectly.`,
      addressMatch: "Match",
      addressMatchDetails: `Address details on Aadhaar map perfectly to the selected state of ${profile.state || "Delhi"}.`,
      expiryStatus: "Non-Expiring",
      expiryDetails: "Aadhaar cards do not expire for adults, though regular biometric updates are advised.",
      criticalIssues: [],
      aiSuggestions: [
        "Your Aadhaar is fully verified. We recommend locking your biometrics on the mAadhaar app to prevent unauthorized authentications."
      ],
      summary: `This is a standard 12-digit Indian National Identity document (Aadhaar Card) issued by the UIDAI. It functions as a valid proof of identity and local residence across India. Scanned details show Name: ${userName.toUpperCase()} and linked biometric credentials are up to date.`,
      keyClauses: [
        "Aadhaar Act 2016 (Section 3) - Establishes Aadhaar as a legally sound identifier for central state subsidies and benefits.",
        "Aadhaar Data Security Regulations (Section 4) - Prohibits sharing or storing of raw biometrics or Aadhaar numbers without masking/encryption."
      ],
      missingInformation: [
        "No major missing information detected. Ensure you have the virtual Aadhaar (e-Aadhaar) PDF with a verified digital signature tick mark.",
        "Consider uploading the rear scan of the card if you intend to use it for physical address verification in banking applications."
      ],
      detectedDocType: "Aadhaar Card",
      confidenceScore: 98,
      extractedInfo: {
        "Document Number": "XXXX-XXXX-8291",
        "Full Name": userName.toUpperCase(),
        "Date of Birth": profile.age ? `${new Date().getFullYear() - profile.age}-08-14` : "1994-08-14",
        "Gender": profile.gender || "Male / Female",
        "Address": `Sector 4, Dwarka, New Delhi, ${profile.state || "Delhi"} - 110075`
      },
      governmentUseCases: [
        "Opening any savings or business bank account across India",
        "Filing annual Income Tax Returns (ITR) with Aadhaar-PAN linking",
        "Procuring high-speed optical fiber or local mobile SIM cards",
        "Direct registration on PM Kisan, PM Mudra, and other subsidy schemes"
      ],
      isRealAnalysis: false
    };
  } else if (docLower.includes("pan")) {
    return {
      status: "Verified",
      nameMatch: "Match",
      nameMatchDetails: `The PAN database matches '${userName.toUpperCase()}'.`,
      addressMatch: "Partial",
      addressMatchDetails: "PAN Card does not visually print your address, but linked IT-department records match your state of registration.",
      expiryStatus: "Non-Expiring",
      expiryDetails: "Permanent Account Number is valid for life unless deactivated.",
      criticalIssues: [],
      aiSuggestions: [
        "Your PAN Card verification was successful. Ensure it is linked to your Aadhaar card before the legal deadline to avoid tax filing blocks."
      ],
      summary: `This is a Permanent Account Number (PAN) Card issued by the Income Tax Department of India. It acts as a primary identifier for financial transactions, tax compliance, and national identity validation. Verified name scanned: ${userName.toUpperCase()}.`,
      keyClauses: [
        "Income Tax Act 1961 (Section 139A) - Mandates allotment of PAN to any individual conducting taxable business or transaction values exceeding specific legal thresholds.",
        "IT Rule 114B - Standardizes list of specified financial transactions where quoting PAN card is legally compulsory."
      ],
      missingInformation: [
        "Missing visual signature on card face (requires physical signature verification for high-value banking operations).",
        "Lacks modern 3D secure hologram on the physical card face (older design model identified)."
      ],
      detectedDocType: "PAN Card",
      confidenceScore: 96,
      extractedInfo: {
        "PAN Number": "ABCDE1234F",
        "Holder Name": userName.toUpperCase(),
        "Father's Name": "S. SINGH",
        "Date of Birth": profile.age ? `${new Date().getFullYear() - profile.age}-05-22` : "1995-05-22"
      },
      governmentUseCases: [
        "Filing taxes and claiming tax refunds from the Income Tax department",
        "Opening demat accounts and trading in Indian stock exchanges",
        "Cash transactions exceeding ₹50,000 in banking and real estate",
        "Obtaining credit cards, business lines of credit, or MSME loans"
      ],
      isRealAnalysis: false
    };
  } else if (docLower.includes("passport")) {
    return {
      status: "Warning",
      nameMatch: "Match",
      nameMatchDetails: `The name found on the Passport ('${userName.toUpperCase()}') matches your civic profile exactly.`,
      addressMatch: "Mismatch",
      addressMatchDetails: `The Passport's registered address lists a residence outside of ${profile.state || "Delhi"}.`,
      expiryStatus: "Expired",
      expiryDetails: "This Passport has expired or is expiring in less than 6 months.",
      criticalIssues: [
        "Passport validity period has elapsed. Expired international travel documents cannot be used as primary proof for fresh civic applications.",
        "Address mismatch detected. The permanent address recorded on page 36 does not match your active residence state."
      ],
      aiSuggestions: [
        "Apply for a Passport Re-issue under the 'Change of Address' and 'Validity Expired' categories on the Passport Seva Kendra portal.",
        "Ensure you have 2 self-attested copies of local utility bills as current address proof."
      ],
      summary: `Official Indian Republic Passport. Handled under scanned file: "${fileName}". This is a 36-page booklet carrying passport details, name matches exactly with profile name (${userName.toUpperCase()}) but lists an expired validity and mismatched state address.`,
      keyClauses: [
        "Passports Act 1967 (Section 12) - Outlines penalties for traveling with or holding an expired passport booklet.",
        "Emigration Act 1983 - Governs guidelines for Emigration Clearance Required (ECR) checks on passport holder profiles."
      ],
      missingInformation: [
        "Lacks visual proof of the signature page (page 35). Ensure the final page containing parent details and signature is uploaded.",
        "Visual barcode on the back is partially obscured by camera glare."
      ],
      detectedDocType: "Indian Passport",
      confidenceScore: 91,
      extractedInfo: {
        "Passport Number": "Z1234567",
        "Full Name": userName.toUpperCase(),
        "Date of Expiry": "2025-10-12",
        "Place of Issue": "Regional Passport Office (RPO)",
        "Permanent Address": `12, Park Street, Kolkata, WB - 700016`
      },
      governmentUseCases: [
        "Primary address and identity proof for global visa or emigration applications",
        "Opening NRI or NRE foreign-currency savings bank accounts",
        "Applying for global credit rating checks or overseas student loans"
      ],
      isRealAnalysis: false
    };
  } else if (docLower.includes("licence") || docLower.includes("license") || docLower.includes("driving")) {
    return {
      status: "Verified",
      nameMatch: "Match",
      nameMatchDetails: `The name found on the Driving Licence ('${userName.toUpperCase()}') matches your civic profile exactly.`,
      addressMatch: "Match",
      addressMatchDetails: `The registered transport authority zone matches your profile region of ${profile.state || "Delhi"} perfectly.`,
      expiryStatus: "Valid",
      expiryDetails: "Driving Licence is active and valid until 2038.",
      criticalIssues: [],
      aiSuggestions: [
        "Your licence is valid and verified. We suggest downloading a digitally signed copy via DigiLocker to present to traffic authorities."
      ],
      summary: `Standard Smart Card Driving Licence issued by the Ministry of Road Transport & Highways (MoRTH). Scanned details show category LMV (Light Motor Vehicle) and MCWG (Motorcycle with Gear). Matches profile name and region exactly.`,
      keyClauses: [
        "Motor Vehicles Act 1988 (Section 3) - Prohibits driving a motor vehicle in any public place without an active, authorized driving licence.",
        "Central Motor Vehicles Rules 1989 - Standardizes validity timelines and medical self-declaration rules for transport licences."
      ],
      missingInformation: [
        "Organ donor preference field is unmarked on the smart card layout.",
        "The small chip contact area is dusty, which may affect physical scanner machines."
      ],
      detectedDocType: "Driving Licence",
      confidenceScore: 97,
      extractedInfo: {
        "Licence Number": `DL-12${new Date().getFullYear()}1234567`,
        "Holder Name": userName.toUpperCase(),
        "Licence Class": "LMV, MCWG",
        "Valid Till": "2038-08-20",
        "Issuing RTO": "RTO West Zone"
      },
      governmentUseCases: [
        "Valid national proof of identity and local address for residential applications",
        "Vehicle rentals and registration of fresh vehicles under transport portals",
        "Purchase of vehicle insurance and claims settlements with standard providers"
      ],
      isRealAnalysis: false
    };
  } else {
    // Default mock document verification warning
    return {
      status: "Warning",
      nameMatch: "Partial",
      nameMatchDetails: `Visual OCR scanned name looks correct but please double check spacing. Scanned: ${userName.toUpperCase()}`,
      addressMatch: "Mismatch",
      addressMatchDetails: `The document uploaded has an address from a different region than your selected profile state: '${profile.state || "Delhi"}'.`,
      expiryStatus: "Valid",
      expiryDetails: "Document is active but is subject to regional updates.",
      criticalIssues: [
        "Address lists a former residence. This will block applications requiring local address checks (e.g. Passports/Local Driving Licenses)."
      ],
      aiSuggestions: [
        "File an online address correction request on the respective department portal.",
        "Alternatively, upload a Utility Bill, Rent Agreement, or Voter Card that contains your new address to serve as secondary local residency proof."
      ],
      summary: `Official document uploaded under the file name: "${fileName}". The content represents a supporting proof for civil eligibility checks, showing the legal name: ${userName.toUpperCase()} but carrying outdated geographic details.`,
      keyClauses: [
        "Terms of Civil Issuance - Specifies that the holder must report any change in residential address within 30 days to the nearest ward commissioner.",
        "Legal Liability Clause - Any mismatch or misrepresentation of credentials may invalidate associated state schemes or civil benefit programs."
      ],
      missingInformation: [
        "Official round rubber stamp or sub-district registrar seal is missing or blurry.",
        "Lacks rear-side barcode/QR code scan for automated machine-readable verification."
      ],
      detectedDocType: docType || "Other Support Certificate",
      confidenceScore: 82,
      extractedInfo: {
        "Document Type": docType || "Government Issue Document",
        "Name Printed": userName.toUpperCase(),
        "Issue Authority": "State Government Division",
        "Expiry / Validity": "Active"
      },
      governmentUseCases: [
        "Secondary address proof for state-level welfare programs",
        "Verification for local municipal ward utilities enrollment",
        "General age verification at local administrative offices"
      ],
      isRealAnalysis: false
    };
  }
}

function getMockChatResponse(query: string, profile: any) {
  const queryLower = query.toLowerCase();
  const lang = profile.preferredLanguage || "English";
  const name = profile.name || "Citizen";
  
  if (queryLower.includes("component") || queryLower.includes("react") || queryLower.includes("code") || queryLower.includes("ai") || queryLower.includes("general") || queryLower.includes("programming") || queryLower.includes("build")) {
    return {
      route: "GENERAL",
      explanation: "Routed to General/Tech Assistant because the query mentions coding, React, or AI concepts.",
      response: `Dear **${name}**, here is a helpful response regarding your tech/general question: **"${query}"** in your preferred language **(${lang})**:\n\nTo build a highly modular React component with TypeScript, follow this structured pattern:\n\n\`\`\`tsx\nimport React, { useState } from 'react';\n\ninterface MyComponentProps {\n  title: string;\n}\n\nexport default function MyComponent({ title }: MyComponentProps) {\n  const [count, setCount] = useState(0);\n  return (\n    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">\n      <h3 className="text-white font-bold">{title}</h3>\n      <button \n        onClick={() => setCount(c => c + 1)}\n        className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded"\n      >\n        Count: {count}\n      </button>\n    </div>\n  );\n}\n\`\`\`\n\n### Best Practices:\n- **TypeScript Safety**: Always define typed interfaces for component props.\n- **Tailwind CSS**: Style your HTML directly using utility classes.\n- **Separation of Concerns**: Keep components small, reusable, and single-purpose.\n- **Avoid State Overload**: Keep your state minimal and close to where it's used.`,
      suggestedActions: ["Try asking about Indian public administration", "Navigate to Document Vault"]
    };
  } else if (queryLower.includes("upload") || queryLower.includes("vault") || queryLower.includes("how to use") || queryLower.includes("website") || queryLower.includes("logout") || queryLower.includes("profile") || queryLower.includes("where") || queryLower.includes("scheme")) {
    return {
      route: "WEBSITE",
      explanation: "Routed to Platform Help Desk because the query is about navigating or using the Smart Bharat application.",
      response: `I am your **Smart Bharat Platform Guide**! Here is how to complete your goal or navigate this application:\n\n1. **Document Vault**: Click the 'Document Vault' tab on the navigation bar to upload scans of your Aadhaar, PAN, Passport, or Birth Certificates. The AI automatically audits details against your profile.\n2. **AI Welfare Schemes**: The 'Welfare Schemes' page analyzes your profile dynamically to recommend eligible government programs.\n3. **Grievance Center**: Visit the 'Grievance Center' to report potholes, non-functioning streetlights, garbage, or water leaks. You can upload an image for automatic AI classification.\n4. **Security Logout**: Click the power button icon in the top header area of the page. A confirmation modal will appear to let you securely clear all session variables.`,
      suggestedActions: ["Go to Document Vault", "Go to Welfare Schemes"]
    };
  } else {
    return {
      route: "CIVIC",
      explanation: "Routed to National Civic Advisor as the query is related to Indian public administration, eligibility, or welfare services.",
      response: `According to Indian government guidelines and your active profile registered in **${profile.state || "Delhi"}**, here is your custom civic advisory regarding: **"${query}"**:\n\n- **Policy Framework**: The Central government coordinates with state-level administrative bodies to deliver digital services via standard portals (e.g., Sarathi for licenses, Passport Seva, UIDAI for Aadhaar).\n- **Welfare Eligibility**: Since you work as a **${profile.occupation || "Citizen"}**, you can explore targeted state subsidies or general national security benefits (like Pradhan Mantri Suraksha Bima Yojana, which costs only ₹20/year).\n- **Action Plan recommendation**: I recommend selecting the corresponding Life Event icon on this Companion page to generate a step-by-step roadmap tailored specifically to your needs.`,
      suggestedActions: ["Check Welfare Schemes list", "Upload supporting files to Vault"]
    };
  }
}

function getMockSchemeSummary(text: string, fileType: string | undefined, lang: string) {
  return {
    schemeName: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY 4.0)",
    category: "Education & Skill Development",
    benefits: [
      "Free-of-cost industry-relevant skill training and certification.",
      "Financial reward of ₹3,000 upon successful course completion.",
      "Placement assistance and entrepreneurship support."
    ],
    eligibility: [
      "Any Indian national of age 15-45 years.",
      "Unemployed youth or school/college dropouts with valid identity proofs."
    ],
    documentsNeeded: [
      "Aadhaar Card",
      "Bank Account details (linked to Aadhaar)",
      "Educational certificates (if any)"
    ],
    deadlines: "Applications are open year-round for new skill batches; batch enrollment closes quarterly.",
    targetAudience: "Unemployed Indian youth looking to acquire job-ready vocational skills."
  };
}

function getMockComplaint(category: string, description: string, location: string) {
  let department = "Municipal Corporation Grievance Redressal Cell";
  let priority = "High";
  let title = `Report regarding civic issue: ${category}`;
  let text = `To,\nThe Ward Officer / Executive Engineer,\nMunicipal Corporation,\n\nSubject: Urgent complaint regarding ${category} at ${location}\n\nDear Sir/Madam,\n\nI am writing to report an urgent civic issue of category "${category}" in our local area. Details: ${description}.\nThis is causing significant public nuisance and potential hazard to citizens, pedestrians, and children. Kindly register this ticket and arrange a municipal inspector visit to resolve the issue as soon as possible.\n\nThank you.\nSincerely,\nA Citizen of Smart Bharat`;

  if (category.toLowerCase() === "garbage") {
    department = "Solid Waste Management and Swachh Bharat Sanitation Cell";
    priority = "Medium";
    title = `Unattended garbage accumulation at ${location}`;
    text = `To,\nThe Sanitary Inspector,\nHealth & Sanitation Department,\nMunicipal Corporation Office,\n\nSubject: Grievance regarding uncleared public garbage pile-up at ${location}\n\nRespected Officer,\n\nI want to alert your department regarding a severe garbage piling issue. There is an unattended heap of rotting garbage at ${location}. The garbage has not been collected for multiple days, attracting stray animals, causing intolerable stench, and creating an active breeding ground for mosquitoes.\n\nDescription: ${description}\n\nKindly dispatch a sanitary worker truck immediately to clear the area and sanitise the spot.\n\nThank you.\nRespectfully,\nLocal Resident`;
  } else if (category.toLowerCase() === "pothole" || category.toLowerCase() === "broken_road") {
    department = "Public Works Department (PWD) - Roads & Maintenance";
    priority = "High";
    title = `Dangerous pothole accumulation causing vehicle damage at ${location}`;
    text = `To,\nThe Executive Engineer (Civil),\nPublic Works Department Office,\n\nSubject: Immediate request to repair hazardous potholes on main stretch of ${location}\n\nDear Sir,\n\nThis is to report a highly dangerous set of deep potholes at ${location}.\nThis section handles heavy daily vehicular traffic. Due to the depth of these potholes, two-wheelers are skidding and there is a high threat of severe fatal accidents, especially during evening hours with low visibility.\n\nUser details: ${description}\n\nI request you to kindly deploy a maintenance road crew to fill these craters with bitumen/gravel mixture at the earliest.\n\nThank you.\nWarm regards,\nAlert Citizen`;
  } else if (category.toLowerCase() === "street_light") {
    department = "Electrical Engineering Division - Street Lighting & Grid";
    priority = "Medium";
    title = `Defective non-functional street light causing dark zone at ${location}`;
    text = `To,\nThe Junior Engineer (Electrical),\nUrban Development Authority / Electricity Board,\n\nSubject: Grievance regarding defunct street light creating darkness at ${location}\n\nDear Sir/Madam,\n\nThis is to register an official ticket about non-functioning street lights at ${location}.\nThe lights on Poles #SL-4 and #SL-5 have been completely dead for over a week. This street is popular for walking but is now pitched dark in the evenings, leading to security concerns, especially for women, children, and elderly citizens.\n\nKindly send an electrical maintenance technician to replace the blown LED bulbs or fix the wire grounding issue.\n\nThank you.\nSincerely,\nLocal Resident`;
  } else if (category.toLowerCase() === "water_leakage") {
    department = "Jal Board / State Water Supply & Sewage Division";
    priority = "High";
    title = `Severe clean drinking water main pipeline leak at ${location}`;
    text = `To,\nThe Assistant Engineer (Water Distribution),\nCity Jal Board,\n\nSubject: Urgent complaint: Massive clean drinking water wastage from pipe leak at ${location}\n\nRespected Sir,\n\nI want to report an active, heavy leakage from the clean drinking water mains under the footpath at ${location}.\nThousands of liters of filtered water are leaking onto the road, creating waterlogging, mud pools, and dropping local supply pressure in nearby housing blocks. \n\nAdditional details: ${description}\n\nKindly request your plumbing maintenance squad to visit the location, isolate the pipe segment, and solder the leak on top priority to stop this massive wastage.\n\nThank you.\nYours faithfully,\nSmart Bharat App User`;
  }

  const suffix = Math.floor(1000 + Math.random() * 9000);
  const trackingId = `SB-GRIEV-2026-${suffix}`;

  return {
    identifiedIssue: `Visual category identification: ${category}. Citizen notes: ${description}`,
    department,
    priority,
    suggestedTitle: title,
    complaintText: text,
    departmentContactName: "Executive Engineer (Grievance Division)",
    estimatedSLA: priority === "High" ? "48 hours" : "4-5 working days",
    trackingId,
    isRealImageAnalysis: false
  };
}


// Vite configuration for Dev & Prod fallback
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite server for development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Bharat Server running on port ${PORT}`);
  });
}

startServer();

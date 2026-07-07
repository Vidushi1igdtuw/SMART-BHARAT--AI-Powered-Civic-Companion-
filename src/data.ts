import { VaultDocument, Scheme, CivicCalendarEvent, CivicNotification, CivicGrievance } from "./types";

export const STATES_AND_CITIES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Tezpur", "Jorhat"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Connaught Place", "Saket"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Agra", "Varanasi"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"]
};

export const OCCUPATIONS = [
  "Student",
  "Software Engineer",
  "Self-employed / Shop Owner",
  "Government Employee",
  "Farmer / Agriculturalist",
  "Teacher / Professor",
  "Daily Wage Worker",
  "Homemaker",
  "Doctor / Healthcare worker",
  "Retired / Senior Citizen",
  "Chartered Accountant / Lawyer",
  "Other"
];

export const INCOME_BRACKETS = [
  "Below ₹1 Lakh (Below Poverty Line)",
  "₹1 Lakh - ₹2.5 Lakhs (Low Income Group)",
  "₹2.5 Lakhs - ₹5 Lakhs (Middle Income Group - A)",
  "₹5 Lakhs - ₹10 Lakhs (Middle Income Group - B)",
  "₹10 Lakhs - ₹20 Lakhs (High Income Group)",
  "Above ₹20 Lakhs"
];

export const INITIAL_NOTIFICATIONS: CivicNotification[] = [
  {
    id: "notif-1",
    title: "Income Tax Return Deadline",
    body: "Reminder: The official deadline to file your financial year ITR is July 31, 2026. File early to avoid penalty.",
    category: "system",
    isRead: false,
    createdAt: "2026-07-05T10:00:00Z"
  },
  {
    id: "notif-2",
    title: "Aadhaar-PAN Link Status",
    body: "Your Aadhaar Card and PAN Card have been checked and are successfully linked. Readiness score improved!",
    category: "document",
    isRead: false,
    createdAt: "2026-07-06T08:30:00Z"
  },
  {
    id: "notif-3",
    title: "New Student Welfare Scheme",
    body: "A new National Post-Matric Scholarship has been launched for technical courses in your state. Review eligibility.",
    category: "scheme",
    isRead: true,
    createdAt: "2026-07-04T12:00:00Z"
  }
];

export const MOCK_CALENDAR_EVENTS: CivicCalendarEvent[] = [
  {
    id: "cal-1",
    title: "Income Tax Return (ITR) Filing",
    date: "2026-07-31",
    category: "Deadline",
    description: "Last date to file your ITR for AY 2026-27 without late fees.",
    badge: "Important"
  },
  {
    id: "cal-2",
    title: "National Scholarship Portal (NSP)",
    date: "2026-10-31",
    category: "Deadline",
    description: "Closing date for fresh registrations for pre-matric & post-matric student scholarships.",
    badge: "Scholarship"
  },
  {
    id: "cal-3",
    title: "Pulse Polio Vaccination Drive",
    date: "2026-08-16",
    category: "Health",
    description: "National immunization day for children under 5 years at nearby Anganwadi and health centers.",
    badge: "Govt Health"
  },
  {
    id: "cal-4",
    title: "Aadhaar Card Validation Audit",
    date: "2026-12-14",
    category: "Renewal",
    description: "UIDAI recommended free online document upload portal deadline for 10-year old Aadhaar updates.",
    badge: "Identity"
  },
  {
    id: "cal-5",
    title: "Driving Licence Expiry Renewal",
    date: "2026-09-05",
    category: "Renewal",
    description: "Your driving licence is expiring in 2 months. Recommended to file Sarathi Parivahan renewal request.",
    badge: "Driving License"
  }
];

export const DEFAULT_SCHEMES: Scheme[] = [
  {
    id: "ayushman-bharat",
    name: "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)",
    category: "Healthcare",
    eligibility: "Lower income groups, rural families listed under SECC 2011 data, families with no active male earning member.",
    benefits: "Cashless coverage of up to ₹5 Lakhs per family per year for secondary and tertiary hospitalization across India.",
    whyRecommended: "Highly recommended to protect your family from emergency secondary and tertiary hospitalization expenses.",
    documentsNeeded: ["Aadhaar Card", "Ration Card / PM Letter", "Income Certificate"],
    estimatedApprovalTime: "7-10 working days"
  },
  {
    id: "pm-mudra",
    name: "Pradhan Mantri MUDRA Yojana (PMMY)",
    category: "Business",
    eligibility: "Micro-enterprises, small business owners, traders, partnership firms, and budding entrepreneurs in India.",
    benefits: "Collateral-free development loans categorized under Shishu (up to ₹50k), Kishor (up to ₹5L), and Tarun (up to ₹10L).",
    whyRecommended: "Perfect for establishing or scaling micro commercial business ventures with subsidised bank rates.",
    documentsNeeded: ["Business Pitch/Plan", "Udyam Registration", "PAN & Aadhaar", "Proof of Office"],
    estimatedApprovalTime: "10-15 working days"
  },
  {
    id: "pm-kisan",
    name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
    category: "Agriculture",
    eligibility: "Small and marginal landholder farmers with cultivable land ownership in their name across any Indian state.",
    benefits: "Direct income support of ₹6,000 per year paid in three equal installments of ₹2,000 directly to bank accounts.",
    whyRecommended: "Direct bank transfer benefit linked to land ownership records in your home state.",
    documentsNeeded: ["Land Khata/Khasra Registration Copy", "Bank Passbook", "Aadhaar Card"],
    estimatedApprovalTime: "15-30 working days"
  },
  {
    id: "pmsby",
    name: "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
    category: "Social Security",
    eligibility: "All savings bank account holders between 18 to 70 years of age.",
    benefits: "Extremely affordable accident insurance of ₹2 Lakhs coverage for death/permanent disability at ₹20 per year premium.",
    whyRecommended: "Highly cost-effective essential social protection cover auto-debited by government banks.",
    documentsNeeded: ["Bank Account Passbook", "Aadhaar Card", "Completed Nominee Form"],
    estimatedApprovalTime: "2-3 working days"
  }
];

export const INITIAL_VAULT_DOCUMENTS: VaultDocument[] = [
  {
    id: "doc-aadhaar",
    name: "Aadhaar Card",
    type: "Identity & Address Proof",
    status: "Verified",
    nameMatch: "Match",
    nameMatchDetails: "Name matches profile perfectly.",
    addressMatch: "Match",
    addressMatchDetails: "Address matches state/city coordinates.",
    expiryStatus: "Non-Expiring",
    expiryDetails: "Aadhaar does not expire.",
    criticalIssues: [],
    aiSuggestions: ["Your Aadhaar is fully integrated. Enable biometrics lock in the mAadhaar app for maximum safety."],
    fileSize: "1.2 MB",
    uploadedAt: "2026-07-06T09:00:00Z",
    fileName: "aadhaar_card_scanned.png",
    summary: "This is a standard 12-digit Indian National Identity document (Aadhaar Card) issued by the UIDAI. It functions as a valid proof of identity and local residence across India. Scanned details show linked biometric credentials are up to date.",
    keyClauses: [
      "Aadhaar Act 2016 (Section 3) - Establishes Aadhaar as a legally sound identifier for central state subsidies and benefits.",
      "Aadhaar Data Security Regulations (Section 4) - Prohibits sharing or storing of raw biometrics or Aadhaar numbers without masking/encryption."
    ],
    missingInformation: [
      "No major missing information detected. Ensure you have the virtual Aadhaar (e-Aadhaar) PDF with a verified digital signature tick mark.",
      "Consider uploading the rear scan of the card if you intend to use it for physical address verification in banking applications."
    ]
  },
  {
    id: "doc-pan",
    name: "PAN Card",
    type: "Financial & Tax Proof",
    status: "Verified",
    nameMatch: "Match",
    nameMatchDetails: "Scanned name matches IT tax records.",
    expiryStatus: "Non-Expiring",
    expiryDetails: "PAN Card does not expire.",
    criticalIssues: [],
    aiSuggestions: ["PAN is verified. Keep it securely linked to your bank account for high-value tax transactions."],
    fileSize: "680 KB",
    uploadedAt: "2026-07-06T09:15:00Z",
    fileName: "pan_card_front.jpg",
    summary: "This is a Permanent Account Number (PAN) Card issued by the Income Tax Department of India. It acts as a primary identifier for financial transactions, tax compliance, and national identity validation.",
    keyClauses: [
      "Income Tax Act 1961 (Section 139A) - Mandates allotment of PAN to any individual conducting taxable business or transaction values exceeding specific legal thresholds.",
      "IT Rule 114B - Standardizes list of specified financial transactions where quoting PAN card is legally compulsory."
    ],
    missingInformation: [
      "Missing visual signature on card face (requires physical signature verification for high-value banking operations).",
      "Lacks modern 3D secure hologram on the physical card face (older design model identified)."
    ]
  },
  {
    id: "doc-voter",
    name: "Voter ID Card",
    type: "Electoral Identity Proof",
    status: "Missing",
    criticalIssues: ["Missing Voter ID Card from your vault. Required for casting votes and serves as local address verification."]
  },
  {
    id: "doc-license",
    name: "Driving Licence",
    type: "Transport Authorization",
    status: "Warning",
    nameMatch: "Match",
    nameMatchDetails: "Matches profile perfectly.",
    addressMatch: "Mismatch",
    addressMatchDetails: "Address state doesn't match current registered profile state.",
    expiryStatus: "Valid",
    expiryDetails: "Expiring on 2026-09-05",
    criticalIssues: [
      "Address lists previous address.",
      "Licence is expiring soon (in under 60 days)."
    ],
    aiSuggestions: [
      "File online driving licence renewal and change of address form (Form 8) on the Sarathi Parivahan portal.",
      "Requires online submission of current local Address Proof (Aadhaar Card or Electricity Bill) and digital fee payment of ₹450."
    ],
    fileSize: "950 KB",
    uploadedAt: "2026-07-06T11:20:00Z",
    fileName: "dl_copy_old.png",
    summary: "This is an official Indian Driving Licence issued by the Regional Transport Office (RTO). It grants road transportation privileges and verifies the operator's age and legal name credentials.",
    keyClauses: [
      "Motor Vehicles Act 1988 (Section 3) - Prohibits any person from driving a motor vehicle in a public place without an active and valid driving licence.",
      "Motor Vehicles Rules (Rule 15) - Requires the holder of a licence to report an address migration or change in details within 30 days to the nearest licensing transport authority."
    ],
    missingInformation: [
      "Original physical issuing inspector stamp or seal is partially illegible due to poor crop quality.",
      "Rear-side endorsement list (specifying specific commercial transport classes) is missing from the scan."
    ]
  }
];

export const MOCK_COMPLAINTS: CivicGrievance[] = [
  {
    id: "comp-1",
    trackingId: "SB-GRIEV-2026-7843",
    category: "pothole",
    description: "Deep pothole measuring nearly 2 feet right in front of Sector 4 central nursery school gate. Highly dangerous for school vans.",
    location: "Sector 4, Main Road, near Green School Gate",
    department: "Public Works Department (PWD) - Roads Maintenance Branch",
    priority: "High",
    suggestedTitle: "Severe Pothole Cluster in Front of School Crossing",
    complaintText: "To,\nThe Executive Engineer,\nPWD Roads Branch,\n\nSubject: Repair request for deep hazardous pothole near school zone...\n\nDear Sir, children and school vans face extreme hazards daily...",
    trackingStatus: "Processing",
    statusTimeline: {
      received: "2026-07-04T10:15:00Z",
      assigned: "2026-07-04T14:30:00Z",
      processing: "2026-07-05T09:00:00Z"
    },
    estimatedSLA: "48 Hours",
    createdAt: "2026-07-04T10:15:00Z"
  },
  {
    id: "comp-2",
    trackingId: "SB-GRIEV-2026-9214",
    category: "garbage",
    description: "Massive pile-up of solid waste in public park corner. Local sweepers dumping dry leaves and organic waste there, attracting stray cows.",
    location: "Sardar Patel Public Park, West Corner",
    department: "Municipal Cleanliness & Solid Waste Management Cell",
    priority: "Medium",
    suggestedTitle: "Public Park Corner Turned into Trash Dumping Yard",
    complaintText: "To,\nThe Sanitary Inspector,\nMunicipal Corporation Office,\n\nSubject: Grievance regarding uncleared solid waste pile-up at Patel Park...\n\nRespected Sir, residents and kids utilizing park face toxic odor...",
    trackingStatus: "Resolved",
    statusTimeline: {
      received: "2026-07-01T08:00:00Z",
      assigned: "2026-07-01T11:00:00Z",
      processing: "2026-07-02T10:00:00Z",
      resolved: "2026-07-03T17:00:00Z"
    },
    estimatedSLA: "4-5 working days",
    createdAt: "2026-07-01T08:00:00Z"
  }
];

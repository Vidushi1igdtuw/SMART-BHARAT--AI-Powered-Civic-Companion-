export interface CitizenProfile {
  name: string;
  age: number;
  gender: string;
  state: string;
  city: string;
  occupation: string;
  income: string;
  isStudent: boolean;
  isBusinessOwner: boolean;
  isFarmer: boolean;
  isSeniorCitizen: boolean;
  preferredLanguage: string;
  disability?: string;
  hasOnboarded: boolean;
}

export interface RoadmapStep {
  step: number;
  title: string;
  description: string;
  status: 'completed' | 'pending' | 'in_progress';
  documentsNeeded: string[];
  timeRequired: string;
  office: string;
  estimatedFees: string;
  actionButtonLabel: string;
}

export interface ActionPlan {
  theme: string;
  summary: string;
  roadmap: RoadmapStep[];
  tips: string[];
  lifeEvent: string;
}

export interface Scheme {
  id: string;
  name: string;
  category: string;
  eligibility: string;
  benefits: string;
  whyRecommended: string;
  documentsNeeded: string[];
  estimatedApprovalTime: string;
}

export interface VaultDocument {
  id: string;
  name: string; // e.g., Aadhaar, PAN, Voter ID, Passport, Marksheet
  type: string; // e.g., Aadhaar Card, PAN Card
  fileName?: string;
  status: 'Verified' | 'Warning' | 'Action Needed' | 'Missing';
  nameMatch?: 'Match' | 'Mismatch' | 'Partial';
  nameMatchDetails?: string;
  addressMatch?: 'Match' | 'Mismatch' | 'Partial';
  addressMatchDetails?: string;
  expiryStatus?: 'Valid' | 'Expiring Soon' | 'Expired' | 'Non-Expiring';
  expiryDetails?: string;
  criticalIssues?: string[];
  aiSuggestions?: string[];
  fileSize?: string;
  uploadedAt?: string;
  summary?: string;
  keyClauses?: string[];
  missingInformation?: string[];
  confidenceScore?: number;
  extractedInfo?: Record<string, string>;
  governmentUseCases?: string[];
}

export interface CivicGrievance {
  id: string;
  trackingId: string;
  category: 'garbage' | 'pothole' | 'street_light' | 'water_leakage' | 'broken_road';
  description: string;
  location: string;
  imageUrl?: string;
  department: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  suggestedTitle: string;
  complaintText: string;
  trackingStatus: 'Received' | 'Assigned' | 'Processing' | 'Resolved';
  statusTimeline: {
    received?: string;
    assigned?: string;
    processing?: string;
    resolved?: string;
  };
  estimatedSLA: string;
  createdAt: string;
}

export interface CivicCalendarEvent {
  id: string;
  title: string;
  date: string;
  category: 'Renewal' | 'Deadline' | 'Notification' | 'Health';
  description: string;
  badge?: string;
}

export interface CivicNotification {
  id: string;
  title: string;
  body: string;
  category: 'scheme' | 'document' | 'complaint' | 'system';
  isRead: boolean;
  createdAt: string;
}

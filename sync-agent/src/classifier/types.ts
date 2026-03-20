import type { RawEmail } from '../imapClient.js';

export type Platform =
  | 'linkedin'
  | 'wellfound'
  | 'mercor'
  | 'direct_email'
  | 'email'
  | 'other';

export type Category =
  | 'recruiter_response'
  | 'inmail_message'
  | 'job_opportunity'
  | 'general_employment_interest'
  | 'application_confirmation'
  | 'application_update'
  | 'rejection'
  | 'interview'
  | 'assessment'
  | 'connection_acceptance'
  | 'digest'
  | 'promo'
  | 'noise'
  | 'unknown';

export type Priority = 'high' | 'medium' | 'low';

export type ApplicationStatus =
  | 'applied'
  | 'in_review'
  | 'responded'
  | 'assessment'
  | 'interview'
  | 'rejected'
  | 'stale'
  | 'unknown'
  | null;

export type LeadType =
  | 'recruiter'
  | 'hiring_manager'
  | 'founder'
  | 'staffing_agency'
  | 'platform_system'
  | 'unknown'
  | null;

export type JobInterestStrength = 'strong' | 'moderate' | 'weak' | 'none';

export interface Classification {
  platform: Platform;
  category: Category;
  priority: Priority;
  action_required: boolean;
  should_create_notification: boolean;
  should_create_or_update_application: boolean;
  should_create_or_update_response_lead: boolean;
  should_suppress: boolean;

  company_name: string | null;
  role_title: string | null;
  contact_name: string | null;
  sender_name: string | null;
  sender_email: string | null;
  location: string | null;
  applied_date: string | null;

  application_status: ApplicationStatus;
  lead_type: LeadType;

  job_interest_detected: boolean;
  job_interest_strength: JobInterestStrength;
  job_interest_score: number;
  job_interest_reason: string | null;

  message_snippet: string | null;
  summary: string;
  reasoning_tags: string[];

  classification_confidence: number;
  needs_review: boolean;

  mercor_stale_rule: {
    applies: boolean;
    expire_if_no_update_after_days: number | null;
  };

  fingerprint: string;
}

// Internal intermediate used during classification pipeline
export interface NormalizedEmail {
  raw: RawEmail;
  subject: string;       // original
  subjectLower: string;  // lowercased
  body: string;          // cleaned body (first 3000 chars)
  bodyLower: string;     // lowercased cleaned body
  combined: string;      // subjectLower + '\n' + bodyLower
  senderAddress: string; // lowercased sender address
  senderName: string;    // original sender name
}

// Backward-compat wrapper used by sync.ts
export interface ClassifiedEmail {
  raw: RawEmail;
  platform: Platform;
  category: Category;
  priority: Priority;
  actionRequired: boolean;
  companyName: string | null;
  contactName: string | null;
  roleTitle: string | null;
  snippet: string;
  fingerprint: string;
  classification: Classification;
}

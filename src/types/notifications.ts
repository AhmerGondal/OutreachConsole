export type NotificationPlatform =
  | 'linkedin'
  | 'wellfound'
  | 'mercor'
  | 'direct_email'
  | 'email'
  | 'other';

export type NotificationCategory =
  | 'application_confirmation'
  | 'application_update'
  | 'recruiter_response'
  | 'inmail_message'
  | 'job_opportunity'
  | 'general_employment_interest'
  | 'interview'
  | 'assessment'
  | 'rejection'
  | 'connection_acceptance'
  | 'digest'
  | 'promo'
  | 'noise'
  | 'unknown'
  // Legacy categories kept for backward compat with existing DB rows
  | 'recruiter_follow_up'
  | 'interview_invite'
  | 'reminder'
  | 'marketing'
  | 'unknown_relevant';

export type NotificationPriority = 'high' | 'medium' | 'low';
export type NotificationStatus = 'unread' | 'read' | 'dismissed' | 'archived';

export interface EmailNotification {
  id: string;
  platform: NotificationPlatform;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionRequired: boolean;
  status: NotificationStatus;
  senderEmail: string | null;
  senderName: string | null;
  subject: string | null;
  companyName: string | null;
  contactName: string | null;
  occurredAt: string | null;
  receivedAt: string;
  snippet: string | null;
  createdAt: string;
}

export type ApplicationStatus =
  | 'active'
  | 'responded'
  | 'interviewing'
  | 'rejected'
  | 'archived'
  | 'unknown';

export interface TrackedApplication {
  id: string;
  platform: NotificationPlatform;
  companyName: string | null;
  roleTitle: string | null;
  firstDetectedAt: string;
  appliedAt: string | null;
  latestEmailAt: string | null;
  applicationStatus: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSummary {
  totalUnread: number;
  actionRequired: number;
  byPlatform: Record<string, number>;
  byCategory: Record<string, number>;
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  application_confirmation: 'Application Sent',
  application_update: 'Application Update',
  recruiter_response: 'Recruiter Response',
  inmail_message: 'Message',
  job_opportunity: 'Job Opportunity',
  general_employment_interest: 'Employment Interest',
  interview: 'Interview',
  assessment: 'Assessment',
  rejection: 'Rejection',
  connection_acceptance: 'Connection',
  digest: 'Digest',
  promo: 'Promo',
  noise: 'Noise',
  unknown: 'Other',
  // Legacy
  recruiter_follow_up: 'Follow-Up',
  interview_invite: 'Interview Invite',
  reminder: 'Reminder',
  marketing: 'Marketing',
  unknown_relevant: 'Other',
};

export const APP_STATUS_LABELS: Record<ApplicationStatus, string> = {
  active: 'Active',
  responded: 'Responded',
  interviewing: 'Interviewing',
  rejected: 'Rejected',
  archived: 'Archived',
  unknown: 'Unknown',
};

export type NotificationPlatform = 'linkedin' | 'wellfound' | 'other';

export type NotificationCategory =
  | 'application_confirmation'
  | 'recruiter_response'
  | 'recruiter_follow_up'
  | 'interview_invite'
  | 'rejection'
  | 'connection_acceptance'
  | 'reminder'
  | 'digest'
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
  recruiter_response: 'Recruiter Response',
  recruiter_follow_up: 'Follow-Up',
  interview_invite: 'Interview Invite',
  rejection: 'Rejection',
  connection_acceptance: 'Connection',
  reminder: 'Reminder',
  digest: 'Digest',
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

export type LeadPlatform = 'LinkedIn' | 'Email' | 'X' | 'Wellfound' | 'Other';

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Replied'
  | 'Positive'
  | 'Negative'
  | 'Follow Up'
  | 'Meeting Booked';

export interface LeadRecord {
  id: string;
  name: string;
  companyName: string;
  platform: LeadPlatform;
  profileUrl: string;
  status: LeadStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

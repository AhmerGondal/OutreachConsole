export interface PlaybookMeta {
  title: string;
  version: string;
}

export interface LeadSource {
  title: string;
  url: string;
  description: string;
  tag: string;
}

export interface DiscoveryCommand {
  title: string;
  command: string;
  note: string;
}

export interface LinkedinFilters {
  titles: string[];
  companySize: string[];
  industries: string[];
  location: string[];
}

export interface DiscoveryChannel {
  instructions: string[];
  commands: DiscoveryCommand[];
  filters?: LinkedinFilters;
}

export interface Discovery {
  intro: string;
  linkedin: DiscoveryChannel;
  google: DiscoveryChannel;
  expanded: DiscoveryChannel;
}

export interface EmailTool {
  title: string;
  url: string;
}

export interface EmailExtraction {
  steps: string[];
  tools: EmailTool[];
  commonPatterns: string[];
  rule: string;
}

export interface MessagingChannel {
  title: string;
  instructions: string[];
  example: string;
}

export interface Messaging {
  linkedin: MessagingChannel;
  email: MessagingChannel;
  followUp: MessagingChannel;
}

export interface Playbook {
  meta: PlaybookMeta;
  leadSources: LeadSource[];
  discovery: Discovery;
  emailExtraction: EmailExtraction;
  messaging: Messaging;
}

export interface Section {
  id: string;
  label: string;
  icon: string;
}

export type LeadStage =
  | "new"
  | "contacted"
  | "engaged"
  | "qualified"
  | "won"
  | "lost";

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "engaged",
  "qualified",
  "won",
  "lost",
];

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  phone: string;
  linkedin: string;
  tags: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  contactId: string;
  source: string;
  stage: LeadStage;
  score: number;
  value: number;
  owner: string;
  lastContactedAt: string;
  nextActionAt: string;
  nextAction: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  goal: string;
  audience: string;
  status: "draft" | "active" | "paused" | "completed";
  templateId: string;
  sentCount: number;
  repliedCount: number;
  createdAt: string;
}

export interface EmailRecord {
  id: string;
  contactId: string;
  campaignId: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "sent" | "failed" | "draft";
  aiGenerated: "yes" | "no";
  prompt: string;
  threadId: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  aiPrompt: string;
  createdAt: string;
}

export interface WorkspaceConfig {
  spreadsheetId: string;
  driveFolderId: string;
  createdAt: string;
}

export interface ContactWithLead extends Contact {
  lead?: Lead;
}

export interface SheetSchema {
  title: string;
  headers: string[];
}

export const SHEETS: Record<string, SheetSchema> = {
  Contacts: {
    title: "Contacts",
    headers: [
      "id",
      "name",
      "email",
      "company",
      "role",
      "phone",
      "linkedin",
      "tags",
      "notes",
      "createdAt",
      "updatedAt",
    ],
  },
  Leads: {
    title: "Leads",
    headers: [
      "id",
      "contactId",
      "source",
      "stage",
      "score",
      "value",
      "owner",
      "lastContactedAt",
      "nextActionAt",
      "nextAction",
      "notes",
      "createdAt",
      "updatedAt",
    ],
  },
  Campaigns: {
    title: "Campaigns",
    headers: [
      "id",
      "name",
      "goal",
      "audience",
      "status",
      "templateId",
      "sentCount",
      "repliedCount",
      "createdAt",
    ],
  },
  Emails: {
    title: "Emails",
    headers: [
      "id",
      "contactId",
      "campaignId",
      "subject",
      "body",
      "sentAt",
      "status",
      "aiGenerated",
      "prompt",
      "threadId",
    ],
  },
  Templates: {
    title: "Templates",
    headers: ["id", "name", "subject", "body", "aiPrompt", "createdAt"],
  },
  Config: {
    title: "Config",
    headers: ["key", "value"],
  },
};

export const SHEET_NAMES = Object.keys(SHEETS) as Array<keyof typeof SHEETS>;

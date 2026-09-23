export type CustomFields = Record<string, string | string[]>;

/** Provider-agnostic lead shape. Each ad platform adapter maps its payload into this. */
export interface NormalizedLead {
  source: string;
  externalId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  pageId?: string;
  formId?: string;
  adId?: string;
  adsetId?: string;
  campaignId?: string;
  customFields: CustomFields;
  submittedAt?: Date;
}

export type IngestOutcome = 'created' | 'updated' | 'unchanged';

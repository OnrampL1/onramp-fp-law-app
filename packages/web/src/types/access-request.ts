export type AccessRequestCompanySize =
  | "ONE_TO_TEN"
  | "ELEVEN_TO_FIFTY"
  | "FIFTY_ONE_TO_TWO_HUNDRED"
  | "TWO_HUNDRED_ONE_TO_ONE_THOUSAND"
  | "ONE_THOUSAND_PLUS";

export interface SubmitAccessRequestPayload {
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  organizationName: string;
  websiteUrl?: string;
  companySize?: AccessRequestCompanySize;
  country?: string;
  intendedUse: string;
  notes?: string;

  // Honeypot field. Real users should never fill this.
  website?: string;
}

export interface SubmitAccessRequestResponse {
  data: {
    message: string;
  };
}

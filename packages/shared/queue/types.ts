// ─── Queue names ───────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  EMAIL: "email",
  EMBEDDINGS: "embeddings",
  INVITATION_EXPIRY: "invitation-expiry",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Job data shapes ───────────────────────────────────────────────────────────
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, string>;
}

export interface EmbeddingsJobData {
  entityId: string;
  entityType: string;
  text: string;
}

// The sweep takes no parameters — it always expires whatever is stale as of
// "now". The (empty) data shape only exists so the queue can be typed.
export type InvitationExpiryJobData = Record<string, never>;

export type JobData = EmailJobData | EmbeddingsJobData | InvitationExpiryJobData;

// ─── Job result shapes ─────────────────────────────────────────────────────────
export interface EmailJobResult {
  messageId: string;
}

export interface EmbeddingsJobResult {
  dimensions: number;
}

export interface InvitationExpiryJobResult {
  expiredCount: number;
}

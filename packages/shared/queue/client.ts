import { Queue, FlowProducer } from "bullmq";
import type { DefaultJobOptions } from "bullmq";
import IORedis from "ioredis";
import {
  QUEUE_NAMES,
  type EmailJobData,
  type EmbeddingsJobData,
  type InvitationExpiryJobData,
  type ContractLegalStateSweepJobData,
  type ExtractionJobData,
  type AIAnalysisJobData,
  type AIAnalysisAggregateJobData,
  type OrganizationBrainEmbeddingsJobData,
  type LegalKbEmbeddingsJobData,
} from "./types";

let redisConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redisConnection = new IORedis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
    });
  }
  return redisConnection;
}

// Exported so FlowProducer.add()'s `queuesOptions` can apply the same
// retry/backoff behavior to flow nodes — FlowProducer does not read a
// Queue instance's defaultJobOptions automatically, it only applies what's
// explicitly passed to it per queue name.
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

function createQueue<T>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: getRedisConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

export const emailQueue = createQueue<EmailJobData>(QUEUE_NAMES.EMAIL);
export const embeddingsQueue = createQueue<EmbeddingsJobData>(
  QUEUE_NAMES.EMBEDDINGS,
);
export const invitationExpiryQueue = createQueue<InvitationExpiryJobData>(
  QUEUE_NAMES.INVITATION_EXPIRY,
);
export const contractLegalStateSweepQueue =
  createQueue<ContractLegalStateSweepJobData>(
    QUEUE_NAMES.CONTRACT_LEGAL_STATE_SWEEP,
  );

export const extractionQueue = createQueue<ExtractionJobData>(
  QUEUE_NAMES.EXTRACTION,
);
export const aiAnalysisQueue = createQueue<AIAnalysisJobData>(
  QUEUE_NAMES.AI_ANALYSIS,
);
export const aiAnalysisAggregateQueue = createQueue<AIAnalysisAggregateJobData>(
  QUEUE_NAMES.AI_ANALYSIS_AGGREGATE,
);

export const organizationBrainEmbeddingsQueue =
  createQueue<OrganizationBrainEmbeddingsJobData>(
    QUEUE_NAMES.ORGANIZATION_BRAIN_EMBEDDINGS,
  );

export const legalKbEmbeddingsQueue = createQueue<LegalKbEmbeddingsJobData>(
  QUEUE_NAMES.LEGAL_KB_EMBEDDINGS,
);

let flowProducer: FlowProducer | null = null;

export function getFlowProducer(): FlowProducer {
  if (!flowProducer) {
    flowProducer = new FlowProducer({ connection: getRedisConnection() });
  }
  return flowProducer;
}

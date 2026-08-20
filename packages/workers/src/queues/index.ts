import { Worker } from "bullmq";
import {
  getRedisConnection,
  invitationExpiryQueue,
  contractLegalStateSweepQueue,
  notificationExpiringSweepQueue,
  QUEUE_NAMES,
} from "@starter-kit/shared";
import { processEmailJob } from "../jobs/email.job";
import { processEmbeddingsJob } from "../jobs/embeddings.job";
import { processInvitationExpiryJob } from "../jobs/invitation-expiry.job";
import { processContractLegalStateSweepJob } from "../jobs/contract-legal-state-sweep.job";
import { processExtractionJob } from "../jobs/extraction.job";
import { processAIAnalysisJob } from "../jobs/ai-analysis.job";
import { processAIAnalysisAggregateJob } from "../jobs/ai-analysis-aggregate.job";
import { processOrganizationBrainEmbeddingsJob } from "../jobs/organization-brain-embeddings.job";
import { processLegalKbEmbeddingsJob } from "../jobs/legal-kb-embeddings.job";
import { processNotificationExpiringSweepJob } from "../jobs/notification-expiring-sweep.job";

const INVITATION_EXPIRY_SWEEP_JOB_ID = "invitation-expiry-sweep";
const INVITATION_EXPIRY_INTERVAL_MS = 60 * 60 * 1000; // hourly

const CONTRACT_LEGAL_STATE_SWEEP_JOB_ID = "contract-legal-state-sweep";
const CONTRACT_LEGAL_STATE_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

const NOTIFICATION_EXPIRING_SWEEP_JOB_ID = "notification-expiring-sweep";
const NOTIFICATION_EXPIRING_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

// Registers the recurring sweep. BullMQ keys repeatable jobs by their repeat
// options + jobId, so calling this on every worker restart is idempotent —
// it will not create duplicate schedules.
export async function scheduleInvitationExpirySweep(): Promise<void> {
  await invitationExpiryQueue.add(
    "sweep",
    {},
    {
      repeat: { every: INVITATION_EXPIRY_INTERVAL_MS },
      jobId: INVITATION_EXPIRY_SWEEP_JOB_ID,
    },
  );
}

export async function scheduleContractLegalStateSweep(): Promise<void> {
  await contractLegalStateSweepQueue.add(
    "sweep",
    {},
    {
      repeat: { every: CONTRACT_LEGAL_STATE_SWEEP_INTERVAL_MS },
      jobId: CONTRACT_LEGAL_STATE_SWEEP_JOB_ID,
    },
  );
}

export async function scheduleNotificationExpiringSweep(): Promise<void> {
  await notificationExpiringSweepQueue.add(
    "sweep",
    {},
    {
      repeat: { every: NOTIFICATION_EXPIRING_SWEEP_INTERVAL_MS },
      jobId: NOTIFICATION_EXPIRING_SWEEP_JOB_ID,
    },
  );
}

export function createWorkers(): Worker[] {
  const connection = getRedisConnection();

  const emailWorker = new Worker(QUEUE_NAMES.EMAIL, processEmailJob, {
    connection,
    concurrency: 10,
  });

  const embeddingsWorker = new Worker(
    QUEUE_NAMES.EMBEDDINGS,
    processEmbeddingsJob,
    {
      connection,
      concurrency: 5,
    },
  );

  const invitationExpiryWorker = new Worker(
    QUEUE_NAMES.INVITATION_EXPIRY,
    processInvitationExpiryJob,
    {
      connection,
      concurrency: 1,
    },
  );

  const contractLegalStateSweepWorker = new Worker(
    QUEUE_NAMES.CONTRACT_LEGAL_STATE_SWEEP,
    processContractLegalStateSweepJob,
    {
      connection,
      concurrency: 1,
    },
  );

  const extractionWorker = new Worker(
    QUEUE_NAMES.EXTRACTION,
    processExtractionJob,
    {
      connection,
      // Overridable per environment — production lowers this on the 1 GB
      // VPS, since concurrent large-file parsing is the likeliest source of
      // memory pressure there.
      concurrency: Number(process.env.EXTRACTION_CONCURRENCY ?? 3),
    },
  );

  const aiAnalysisWorker = new Worker(
    QUEUE_NAMES.AI_ANALYSIS,
    processAIAnalysisJob,
    {
      connection,
      concurrency: Number(process.env.AI_ANALYSIS_CONCURRENCY ?? 2),
    },
  );

  const aiAnalysisAggregateWorker = new Worker(
    QUEUE_NAMES.AI_ANALYSIS_AGGREGATE,
    processAIAnalysisAggregateJob,
    {
      connection,
      concurrency: Number(process.env.AI_ANALYSIS_CONCURRENCY ?? 2),
    },
  );

  const organizationBrainEmbeddingsWorker = new Worker(
    QUEUE_NAMES.ORGANIZATION_BRAIN_EMBEDDINGS,
    processOrganizationBrainEmbeddingsJob,
    {
      connection,
      concurrency: 5,
    },
  );

  const legalKbEmbeddingsWorker = new Worker(
    QUEUE_NAMES.LEGAL_KB_EMBEDDINGS,
    processLegalKbEmbeddingsJob,
    {
      connection,
      concurrency: 5,
    },
  );

  const notificationExpiringSweepWorker = new Worker(
    QUEUE_NAMES.NOTIFICATION_EXPIRING_SWEEP,
    processNotificationExpiringSweepJob,
    {
      connection,
      concurrency: 1,
    },
  );

  const workers = [
    emailWorker,
    embeddingsWorker,
    invitationExpiryWorker,
    contractLegalStateSweepWorker,
    extractionWorker,
    aiAnalysisWorker,
    aiAnalysisAggregateWorker,
    organizationBrainEmbeddingsWorker,
    legalKbEmbeddingsWorker,
    notificationExpiringSweepWorker,
  ];

  workers.forEach((worker) => {
    worker.on("completed", (job) => {
      console.info(`[${worker.name}] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[${worker.name}] Job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
      console.error(`[${worker.name}] Worker error:`, err);
    });
  });

  return workers;
}

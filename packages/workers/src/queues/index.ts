import { Worker } from "bullmq";
import {
  getRedisConnection,
  invitationExpiryQueue,
  QUEUE_NAMES,
} from "@starter-kit/shared";
import { processEmailJob } from "../jobs/email.job";
import { processEmbeddingsJob } from "../jobs/embeddings.job";
import { processInvitationExpiryJob } from "../jobs/invitation-expiry.job";

const INVITATION_EXPIRY_SWEEP_JOB_ID = "invitation-expiry-sweep";
const INVITATION_EXPIRY_INTERVAL_MS = 60 * 60 * 1000; // hourly

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

  const workers = [emailWorker, embeddingsWorker, invitationExpiryWorker];

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

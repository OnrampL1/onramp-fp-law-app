import OpenAI from "openai";

export class AiProviderError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiProviderError";
    this.retryable = retryable;
  }
}

function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) return true; // If status is undefined, we consider it retryable
  if (status === 429) return true; // Rate limit error
  if (status >= 500) return true; // Server errors
  return false; // Other errors are not retryable
}
export function classifyProviderError(error: unknown): AiProviderError {
  if (error instanceof OpenAI.APIError) {
    return new AiProviderError(error.message, isRetryableStatus(error.status), {
      cause: error,
    });
  }
  return new AiProviderError(
    error instanceof Error ? error.message : "Unknown provider error",
    true,
    { cause: error },
  );
}

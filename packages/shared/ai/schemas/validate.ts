import type { ZodTypeAny, z } from "zod";
import { getCompletion, markValidationFailed } from "../providers";
import type { AiCompletionRequest } from "../types";

export class AiValidationError extends Error {
  readonly callLogId: string;

  constructor(message: string, callLogId: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiValidationError";
    this.callLogId = callLogId;
  }
}

export interface StructuredCompletionResult<T> {
  data: T;
  model: string;
  tokensIn: number;
  tokensOut: number;
  callLogId: string;
}

export async function getValidatedCompletion<T extends ZodTypeAny>(
  request: AiCompletionRequest,
  schema: T,
): Promise<StructuredCompletionResult<z.infer<T>>> {
  const result = await getCompletion(request);

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.content);
  } catch (error) {
    await markValidationFailed(result.callLogId, "Response was not valid JSON");
    throw new AiValidationError(
      "AI response was not valid JSON",
      result.callLogId,
    );
  }

  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    const message = `AI response failed schema validation: ${validation.error.message}`;
    await markValidationFailed(result.callLogId, message);
    throw new AiValidationError(message, result.callLogId);
  }

  return {
    data: validation.data,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    callLogId: result.callLogId,
  };
}

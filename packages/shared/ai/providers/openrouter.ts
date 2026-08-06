import OpenAI from "openai";
import { getOpenRouterApiKey } from "../config";
import type { AiMessage } from "../types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

let client: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: getOpenRouterApiKey(),
      baseURL: OPENROUTER_BASE_URL,
    });
  }
  return client;
}

export interface OpenRouterCompletionResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
}

export async function callOpenRouter(
  messages: AiMessage[],
  model: string,
  temperature?: number,
  maxTokens?: number,
): Promise<OpenRouterCompletionResult> {
  const response = await getOpenRouterClient().chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature,
    max_tokens: maxTokens,
  });

  return {
    content: response.choices[0]?.message?.content ?? "",
    tokensIn: response.usage?.prompt_tokens ?? 0,
    tokensOut: response.usage?.completion_tokens ?? 0,
  };
}

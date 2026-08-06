function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getOpenRouterApiKey(): string {
  return getRequiredEnv("OPENROUTER_API_KEY");
}

export function getDefaultAiModel(): string {
  return process.env.AI_DEFAULT_MODEL ?? "openai/gpt-4o-mini";
}

/**
 * CNS: OpenAI-compatible client config (OmniRoute / official OpenAI).
 * Set OPENAI_BASE_URL to e.g. http://omniroute:20128/v1 and OPENAI_MODEL to auto/chat.
 */
export function openAiApiKey(): string {
  return process.env.OPENAI_API_KEY || 'sk-omniroute';
}

/** Base URL including /v1 when pointing at OmniRoute. */
export function openAiBaseUrl(): string | undefined {
  const raw = (process.env.OPENAI_BASE_URL || '').trim().replace(/\/$/, '');
  if (!raw) return undefined;
  return raw.endsWith('/v1') ? raw : `${raw}/v1`;
}

export function openAiChatModel(fallback = 'gpt-4.1'): string {
  return (process.env.OPENAI_MODEL || fallback).trim() || fallback;
}

export function openAiSdkOptions() {
  const baseURL = openAiBaseUrl();
  return {
    apiKey: openAiApiKey(),
    ...(baseURL ? { baseURL } : {}),
  };
}

/** LangChain ChatOpenAI options */
export function chatOpenAiOptions(extra: Record<string, unknown> = {}) {
  const baseURL = openAiBaseUrl();
  return {
    apiKey: openAiApiKey(),
    model: openAiChatModel(),
    temperature: 0.7,
    ...(baseURL ? { configuration: { baseURL } } : {}),
    ...extra,
  };
}

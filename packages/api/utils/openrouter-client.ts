/**
 * Fetch-based OpenRouter client for use in Node.js scripts.
 * No SDK dependency — uses built-in fetch (Node 18+).
 */

export class AiRateLimitError extends Error {
  constructor() {
    super("Rate limit exceeded (429). Wait a moment and retry.");
    this.name = "AiRateLimitError";
  }
}

export class AiParseError extends Error {
  constructor(raw: string) {
    super(`Failed to parse AI response as JSON. Raw: ${raw.slice(0, 200)}`);
    this.name = "AiParseError";
  }
}

export class AiNetworkError extends Error {
  constructor(message: string) {
    super(`Network error: ${message}`);
    this.name = "AiNetworkError";
  }
}

export interface AiConfig {
  endpoint: string; // e.g. "https://openrouter.ai/api/v1"
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Extracts JSON from a markdown code block if present. */
function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? (match[1]?.trim() ?? text.trim()) : text.trim();
}

/** Sleep for ms milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls OpenRouter /chat/completions with exponential backoff on 429/503/504.
 * Returns the parsed JSON from the model's response.
 */
export async function chatCompletion(config: AiConfig, messages: ChatMessage[]): Promise<unknown> {
  const url = `${config.endpoint}/chat/completions`;
  const maxRetries = 5;
  // Base backoff durations in ms: 1s, 2s, 4s, 8s, 16s
  const baseBackoffs = [1000, 2000, 4000, 8000, 16000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });
    } catch (err) {
      throw new AiNetworkError(err instanceof Error ? err.message : String(err));
    }

    const isRetryable = res.status === 429 || res.status === 503 || res.status === 504;

    if (!res.ok && !isRetryable) {
      const body = await res.text().catch(() => "");
      throw new AiNetworkError(`HTTP ${res.status}: ${body.slice(0, 100)}`);
    }

    if (isRetryable && attempt < maxRetries) {
      // Respect Retry-After header when present
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : null;
      const baseMs = baseBackoffs[attempt] ?? 16000;
      // +-25% jitter
      const jitter = baseMs * 0.25 * (Math.random() * 2 - 1);
      const waitMs = retryAfterMs ?? baseMs + jitter;
      await sleep(waitMs);
      continue;
    }

    if (isRetryable && attempt === maxRetries) {
      throw new AiRateLimitError();
    }

    let rawText: string;
    try {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      rawText = data.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      throw new AiNetworkError(`Failed to parse response body: ${String(err)}`);
    }

    try {
      return JSON.parse(rawText);
    } catch {
      // Fallback: try stripping markdown code fence
      try {
        return JSON.parse(extractJson(rawText));
      } catch {
        throw new AiParseError(rawText);
      }
    }
  }

  // Should be unreachable
  throw new AiNetworkError("Exceeded maximum retries");
}

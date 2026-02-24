export class AiRateLimitError extends Error {
  constructor() {
    super("Rate limit exceeded (429). Wait a moment and retry.");
    this.name = "AiRateLimitError";
  }
}

export class AiParseError extends Error {
  constructor(raw: string) {
    super(`Failed to parse AI response as JSON. Raw: ${raw.slice(0, 100)}`);
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
  endpoint: string;
  apiKey: string;
  model: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Extracts JSON from a markdown code block if present */
function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

export async function chatCompletion(
  config: AiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${config.endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new AiNetworkError(err instanceof Error ? err.message : String(err));
  }

  if (res.status === 429) throw new AiRateLimitError();

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AiNetworkError(`HTTP ${res.status}: ${body.slice(0, 100)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";

  try {
    return JSON.parse(content);
  } catch {
    // Fallback: try extracting from markdown code block
    try {
      return JSON.parse(extractJson(content));
    } catch {
      throw new AiParseError(content);
    }
  }
}

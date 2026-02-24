import { OpenRouter } from "@openrouter/sdk";

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
  if (signal?.aborted) {
    const err = new Error("Aborted");
    err.name = "AbortError";
    throw err;
  }

  const client = new OpenRouter({ apiKey: config.apiKey });

  let content: string;
  try {
    // stream: false selects the non-streaming overload → return type is ChatResponse (has .choices)
    const apiCall = client.chat.send({
      chatGenerationParams: {
        model: config.model,
        // Cast to satisfy SDK's union message type while keeping our simpler local type
        messages: messages as { role: "system" | "user" | "assistant"; content: string }[],
        temperature: 0.3,
        responseFormat: { type: "json_object" },
        stream: false,
      },
    });

    let result;
    if (signal) {
      // Race SDK call against abort signal so cancel works
      const abortPromise = new Promise<never>((_, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            const abortErr = new Error("Aborted");
            abortErr.name = "AbortError";
            reject(abortErr);
          },
          { once: true },
        );
      });
      result = await Promise.race([apiCall, abortPromise]);
    } else {
      result = await apiCall;
    }

    content = result.choices[0]?.message?.content ?? "";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;

    // SDK throws errors with a numeric `.status` property for HTTP errors
    if (err != null && typeof err === "object" && "status" in err) {
      const status = (err as { status: number }).status;
      if (status === 429) throw new AiRateLimitError();
      const msg = err instanceof Error ? err.message : String(err);
      throw new AiNetworkError(`HTTP ${status}: ${msg.slice(0, 100)}`);
    }

    throw new AiNetworkError(err instanceof Error ? err.message : String(err));
  }

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

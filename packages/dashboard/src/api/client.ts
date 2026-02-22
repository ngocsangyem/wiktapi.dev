const API_BASE = "/v1";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
      ...init,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error((error as { message?: string }).message ?? `API error ${res.status}`);
    }
    if (res.status === 204) return null as T;
    return res.json() as Promise<T>;
  } catch (err) {
    // Ignore abort errors - this is expected when cancelling requests
    if (err instanceof Error && err.name === "AbortError") {
      return Promise.reject(new Error("cancelled"));
    }
    throw err;
  }
}

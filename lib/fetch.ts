import { useState, useEffect, useCallback } from "react";

const DEFAULT_API_BASE_URL = "https://quickhands-api.onrender.com";

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");

export function getApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/(api)/")
    ? path.replace("/(api)/", "/api/")
    : path.startsWith("/")
      ? path
      : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * The API's free-tier host spins down after inactivity — the first request
 * after it's been idle can take 20-50s to wake it and sometimes drops
 * outright. This wraps fetch with a timeout and a couple of retries so that
 * scenario self-heals instead of surfacing as a hard error.
 */
export async function fetchWithRetry(
  input: string,
  init: RequestInit = {},
  opts: { retries?: number; timeoutMs?: number; retryDelayMs?: number } = {}
): Promise<Response> {
  const { retries = 2, timeoutMs = 20000, retryDelayMs = 3000 } = opts
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(input, { ...init, signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      lastError = error
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      }
    }
  }

  throw lastError
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export const fetchAPI = async <T = unknown>(url: string, options: RequestInit = {}): Promise<T> => {
  try {
    const headers = new Headers(options.headers);

    if (typeof options.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(getApiUrl(url), {
      ...options,
      headers,
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      const message =
        data && typeof data === "object"
          ? (data as { message?: string; error?: string }).message ||
            (data as { message?: string; error?: string }).error
          : null;

      throw new Error(message || `HTTP error! status: ${response.status}`);
    }

    return data as T;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI<{ data?: T }>(url, options);
      setData(result?.data ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

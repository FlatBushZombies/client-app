import { useState, useEffect, useCallback } from "react";

const DEFAULT_API_BASE_URL = "https://quickhands-api.vercel.app";

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

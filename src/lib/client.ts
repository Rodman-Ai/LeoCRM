async function jsonFetch<T>(
  url: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const { body, headers, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const msg =
      (parsed as { error?: string } | null)?.error ??
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return parsed as T;
}

export const api = {
  get: <T>(url: string) => jsonFetch<T>(url),
  post: <T>(url: string, body: unknown) =>
    jsonFetch<T>(url, { method: "POST", body }),
  patch: <T>(url: string, body: unknown) =>
    jsonFetch<T>(url, { method: "PATCH", body }),
  del: <T>(url: string) => jsonFetch<T>(url, { method: "DELETE" }),
};

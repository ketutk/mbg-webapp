export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function api<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const url = path.startsWith("/api") ? path : `/api${path}`;
  const method = options?.method ?? "GET";
  const hasBody = options?.body !== undefined;

  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {}

  if (!res.ok) {
    const errObj = (
      payload as {
        error?: { code?: string; message?: string; fields?: Record<string, string> };
      } | null
    )?.error;
    throw new ApiError(
      res.status,
      errObj?.code ?? "REQUEST_FAILED",
      errObj?.message ?? `Request failed (${res.status})`,
      errObj?.fields,
    );
  }

  return payload as T;
}


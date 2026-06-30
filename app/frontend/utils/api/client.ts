export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isJson(res: Response): boolean {
  return !!res.headers
    .get("Content-Type")
    ?.toLowerCase()
    .includes("application/json");
}

export async function apiClient<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    let body: unknown;
    let message = `${res.status} ${res.statusText}`;
    if (isJson(res)) {
      body = await res.json().catch(() => undefined);
      // API routes return errors as `{ error: string }`; surface that to the
      // caller so mutation `onError` handlers can show a useful message.
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        message = body.error;
      }
    }
    throw new ApiError(res.status, message, body);
  }

  if (isJson(res)) {
    return res.json() as Promise<T>;
  } else {
    return res.text() as Promise<T>;
  }
}

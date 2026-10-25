export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export function isForbidden(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

export async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (init?.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(input, {
    ...init,
    headers,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new ApiError(response.status, data.error || "Something went wrong.");
  }
  return data as T;
}

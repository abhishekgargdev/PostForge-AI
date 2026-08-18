type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type ApiErrorResponse = {
  success: false;
  error: {
    message: string;
    code?: string;
  };
};

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiClientError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !json.success) {
    const message =
      !json.success ? json.error.message : "Request failed";
    const code = !json.success ? json.error.code : undefined;
    throw new ApiClientError(message, response.status, code);
  }

  return json.data;
}

export async function uploadApiClient<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !json.success) {
    const message =
      !json.success ? json.error.message : "Upload failed";
    const code = !json.success ? json.error.code : undefined;
    throw new ApiClientError(message, response.status, code);
  }

  return json.data;
}

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiResponse } from "../types/index.js";

export function jsonSuccess<T>(
  c: Context,
  data: T,
  message?: string,
  status: ContentfulStatusCode = 200
) {
  const body: ApiResponse<T> = { success: true, data, message };
  return c.json(body, status);
}

export function jsonError(
  c: Context,
  error: string,
  status: ContentfulStatusCode = 400
) {
  const body: ApiResponse<never> = { success: false, error };
  return c.json(body, status);
}

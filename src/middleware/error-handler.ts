import type { Context } from "hono";
import { jsonError } from "../utils/response.js";

export function handleError(err: unknown, c: Context) {
  console.error("[API Error]", err);

  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";

  const status =
    message.includes("not found") || message.includes("Not found")
      ? 404
      : message.includes("Unauthorized") || message.includes("access")
        ? 403
        : 500;

  const safeMessage =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : message;

  return jsonError(c, safeMessage, status);
}

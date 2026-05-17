import type { Context, Next } from "hono";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { jsonError } from "../utils/response.js";

export type AuthVariables = {
  userId: string;
  accessToken: string;
};

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError(c, "Missing or invalid Authorization header", 401);
  }

  const token = authHeader.slice(7);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return jsonError(c, "Invalid or expired session", 401);
  }

  c.set("userId", data.user.id);
  c.set("accessToken", token);
  await next();
}

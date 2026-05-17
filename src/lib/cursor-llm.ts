import { Agent, CursorAgentError } from "@cursor/sdk";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";

const MODEL_ID = process.env.CURSOR_MODEL_ID ?? "composer-2";

const AGENT_CWD = (() => {
  const dir = path.join(os.tmpdir(), "vocalist-cursor-agent");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
  return dir;
})();

function getApiKey(): string {
  const key = process.env.CURSOR_API_KEY;
  if (!key) {
    throw new Error(
      "CURSOR_API_KEY is not configured. Add it to your .env (get a key at https://cursor.com/dashboard).",
    );
  }
  return key;
}

async function runAgentPrompt(message: string): Promise<string> {
  try {
    const result = await Agent.prompt(message, {
      apiKey: getApiKey(),
      model: { id: MODEL_ID },
      local: { cwd: AGENT_CWD, settingSources: [] },
    });
    if (result.status !== "finished") {
      throw new Error(`Cursor agent ${result.status} (run ${result.id})`);
    }
    return (result.result ?? "").trim();
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(`Cursor agent startup failed: ${err.message}`);
    }
    throw err;
  }
}

export type CursorTextOptions = {
  system?: string;
};

export async function cursorText(
  prompt: string,
  opts: CursorTextOptions = {},
): Promise<string> {
  const message = opts.system
    ? `${opts.system}\n\n---\n\n${prompt}`
    : prompt;
  return runAgentPrompt(message);
}

function extractJson(raw: string): string {
  let text = raw.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();

  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);
  if (start === -1) return text;

  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return text.slice(start);
  return text.slice(start, end + 1);
}

function describeSchema(schema: z.ZodTypeAny): string {
  try {
    const maybeToJSON = (z as unknown as {
      toJSONSchema?: (s: z.ZodTypeAny) => unknown;
    }).toJSONSchema;
    if (typeof maybeToJSON === "function") {
      return JSON.stringify(maybeToJSON(schema), null, 2);
    }
  } catch {
    // fall through
  }
  return "(schema description unavailable; infer the shape from field names used below)";
}

export type CursorStructuredOptions = {
  system?: string;
};

export async function cursorStructured<T>(
  prompt: string,
  schema: z.ZodType<T>,
  opts: CursorStructuredOptions = {},
): Promise<T> {
  const schemaDescription = describeSchema(schema);

  const instruction = `${prompt}

OUTPUT FORMAT (strict):
Respond with a SINGLE JSON value and nothing else. No prose before or after. No markdown code fences.
The JSON must validate against this JSON Schema:
${schemaDescription}`;

  const firstRaw = await cursorText(instruction, { system: opts.system });
  const firstJsonStr = extractJson(firstRaw);
  const firstParsed = safeJson(firstJsonStr);
  const firstValidation = firstParsed.ok
    ? schema.safeParse(firstParsed.value)
    : null;
  if (firstValidation && firstValidation.success) return firstValidation.data;

  const failureReason = firstValidation
    ? JSON.stringify(firstValidation.error.issues, null, 2)
    : `JSON parse error: ${firstParsed.ok ? "(unknown)" : firstParsed.error}`;

  const retryInstruction = `${prompt}

PREVIOUS OUTPUT FAILED VALIDATION. Fix it.
Previous output (raw):
${firstRaw}

Validation problem:
${failureReason}

Respond again with a SINGLE JSON value matching this JSON Schema:
${schemaDescription}
No prose. No code fences. Just JSON.`;

  const secondRaw = await cursorText(retryInstruction, { system: opts.system });
  const secondJsonStr = extractJson(secondRaw);
  const secondParsed = safeJson(secondJsonStr);
  if (!secondParsed.ok) {
    throw new Error(`Cursor agent returned non-JSON after retry: ${secondParsed.error}`);
  }
  const secondValidation = schema.safeParse(secondParsed.value);
  if (!secondValidation.success) {
    throw new Error(
      `Cursor agent output failed schema validation after retry: ${JSON.stringify(secondValidation.error.issues)}`,
    );
  }
  return secondValidation.data;
}

function safeJson(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

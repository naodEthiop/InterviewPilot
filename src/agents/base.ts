import { Agent, CursorAgentError } from "@cursor/sdk";
import { env } from "../config/env.js";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());

export interface AgentRunResult {
  text: string;
  runId: string;
  agentId: string;
}

export interface StreamChunk {
  type: "text" | "done" | "error";
  text?: string;
  result?: AgentRunResult;
  error?: string;
}

export function getAgentOptions() {
  return {
    apiKey: env.CURSOR_API_KEY,
    model: { id: env.CURSOR_MODEL_ID },
    local: { cwd: projectRoot, settingSources: [] as ("user" | "project" | "team")[] },
  };
}

/**
 * One-shot agent call with proper disposal (SDK best practice).
 */
export async function runAgentPrompt(prompt: string): Promise<AgentRunResult> {
  try {
    const result = await Agent.prompt(prompt, getAgentOptions());

    if (result.status === "error") {
      throw new Error(`Agent run failed: ${result.id}`);
    }

    const text = extractTextFromResult(result.result);
    return {
      text,
      runId: result.id,
      agentId: result.id,
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(`Cursor agent startup failed: ${err.message}`);
    }
    throw err;
  }
}

/**
 * Streaming agent run for real-time UI updates.
 */
export async function* streamAgentPrompt(
  prompt: string
): AsyncGenerator<StreamChunk> {
  const agent = await Agent.create(getAgentOptions());
  let accumulated = "";

  try {
    const run = await agent.send(prompt);

    if (run.supports("stream")) {
      for await (const event of run.stream()) {
        if (event.type === "assistant") {
          for (const block of event.message.content) {
            if (block.type === "text") {
              accumulated += block.text;
              yield { type: "text", text: block.text };
            }
          }
        }
      }
    }

    const result = await run.wait();

    if (result.status === "error") {
      yield { type: "error", error: `Run failed: ${result.id}` };
      return;
    }

    const finalText = accumulated || extractTextFromResult(result.result);
    yield {
      type: "done",
      result: {
        text: finalText,
        runId: result.id,
        agentId: agent.agentId,
      },
    };
  } catch (err) {
    const message =
      err instanceof CursorAgentError
        ? `Cursor agent error: ${err.message}`
        : err instanceof Error
          ? err.message
          : "Unknown agent error";
    yield { type: "error", error: message };
  } finally {
    await agent[Symbol.asyncDispose]();
  }
}

function extractTextFromResult(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "text" in result) {
    return String((result as { text: string }).text);
  }
  return JSON.stringify(result ?? "");
}

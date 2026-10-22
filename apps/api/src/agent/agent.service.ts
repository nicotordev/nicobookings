import OpenAI from "openai";
import { AGENT_TOOL_DEFINITIONS } from "./tools/definitions.js";
import { dispatchToolCall } from "./tools/dispatcher.js";
import { buildSystemPrompt } from "./prompt.js";
import type { AgentContext, AgentMessage, AgentTurnResult } from "./types.js";

const AGENT_MODEL = "gpt-4.1-mini";
/** Maximum tool-call rounds per turn to prevent infinite loops. */
const MAX_TOOL_ROUNDS = 10;

/**
 * Singleton OpenAI client.
 * OPENAI_API_KEY must be present in the environment.
 */
function getOpenAIClient(): OpenAI {
  const apiKey = Bun.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  return new OpenAI({ apiKey });
}

let _client: OpenAI | null = null;
function openai(): OpenAI {
  _client ??= getOpenAIClient();
  return _client;
}

/* ------------------------------------------------------------------ */
/*  Core agent loop                                                      */
/* ------------------------------------------------------------------ */

/**
 * Runs one conversational turn for the booking agent.
 *
 * @param history - Full message history for this conversation (excluding the system prompt).
 * @param userMessage - The latest message from the customer.
 * @param ctx - Scoped context (contractor, customer, conversation).
 * @returns AgentTurnResult with the assistant reply and metadata.
 *
 * @example
 * ```ts
 * const result = await runAgentTurn([], "I'd like to book a haircut", ctx);
 * console.log(result.reply); // "Sure! Let me check available slots..."
 * ```
 */
export async function runAgentTurn(
  history: AgentMessage[],
  userMessage: string,
  ctx: AgentContext,
): Promise<AgentTurnResult> {
  const startedAt = Date.now();

  const messages: AgentMessage[] = [
    { role: "system", content: buildSystemPrompt(ctx) },
    ...history,
    { role: "user", content: userMessage },
  ];

  let humanHandoff = false;
  let usage: OpenAI.CompletionUsage | null = null;
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const response = await openai().chat.completions.create({
      model: AGENT_MODEL,
      messages,
      tools: AGENT_TOOL_DEFINITIONS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    if (!choice) throw new Error("OpenAI returned no choices.");

    usage = response.usage ?? null;
    const assistantMsg = choice.message;

    // Append assistant turn to local message list (for multi-round context).
    messages.push(assistantMsg);

    // No tool calls → final answer.
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      return {
        reply: assistantMsg.content ?? "",
        humanHandoff,
        usage,
        latencyMs: Date.now() - startedAt,
      };
    }

    // Execute each tool call in parallel.
    const toolResults = await Promise.all(
      assistantMsg.tool_calls
        // Only dispatch function tool calls (skip custom/unknown types).
        .filter((c): c is OpenAI.Chat.ChatCompletionMessageFunctionToolCall => c.type === "function")
        .map(async (call) => {
          const result = await dispatchToolCall(call.function.name, call.function.arguments);

          if (call.function.name === "handoff_to_human") {
            humanHandoff = true;
          }

          return {
            role: "tool" as const,
            tool_call_id: call.id,
            content: JSON.stringify(result),
          };
        }),
    );

    // Push tool results back into the message thread.
    messages.push(...toolResults);

    // If we've handed off, break after processing results so the model
    // can generate a final confirmation message.
    if (humanHandoff && rounds >= 2) break;
  }

  // Fallback: ask the model for a final response after tool round cap.
  const fallback = await openai().chat.completions.create({
    model: AGENT_MODEL,
    messages,
  });

  usage = fallback.usage ?? usage;

  return {
    reply: fallback.choices[0]?.message.content ?? "I'm sorry, something went wrong. Please try again.",
    humanHandoff,
    usage,
    latencyMs: Date.now() - startedAt,
  };
}

/* ------------------------------------------------------------------ */
/*  Message persistence helpers                                          */
/* ------------------------------------------------------------------ */

export { buildSystemPrompt } from "./prompt.js";
export type { AgentContext, AgentMessage, AgentTurnResult } from "./types.js";

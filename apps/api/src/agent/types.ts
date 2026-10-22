import type OpenAI from "openai";

/**
 * Context injected into every agent run.
 * Provides the agent with the current conversation & contractor scope.
 */
export interface AgentContext {
  contractorId: string;
  customerId: string;
  conversationId: string;
  /** Contractor's IANA timezone (e.g. "America/New_York"). */
  timezone: string;
  /** Optional contractor name for personalising the system prompt. */
  contractorName?: string;
}

/**
 * One entry in the message history passed to the agent.
 */
export type AgentMessage = OpenAI.Chat.ChatCompletionMessageParam;

/**
 * Result returned by a single agent turn.
 */
export interface AgentTurnResult {
  /** Final assistant text to send back to the customer. */
  reply: string;
  /** Whether the conversation has been handed off to a human. */
  humanHandoff: boolean;
  /** Raw token usage for cost tracking. */
  usage: OpenAI.CompletionUsage | null;
  /** Latency of the full turn in milliseconds. */
  latencyMs: number;
}

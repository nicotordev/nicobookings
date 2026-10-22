import {
  listServices,
  getAvailability,
  createBooking,
  cancelBooking,
  handoffToHuman,
  identifyCustomer,
} from "./executors.js";
import type { AgentContext } from "../types.js";

type ToolResult = Record<string, unknown>;

/**
 * Dispatches a tool call from the OpenAI agent to the correct executor.
 * Returns a JSON-serializable result or an error object.
 */
export async function dispatchToolCall(
  toolName: string,
  rawArgs: string,
  ctx?: AgentContext,
): Promise<ToolResult> {
  let args: Record<string, unknown>;

  try {
    args = JSON.parse(rawArgs) as Record<string, unknown>;
  } catch {
    return { error: `Invalid JSON arguments for tool "${toolName}".` };
  }

  switch (toolName) {
    case "list_services": {
      const contractorId = (args["contractorId"] as string) || ctx?.contractorId || "";
      return listServices(contractorId);
    }

    case "get_availability": {
      return getAvailability(
        (args["contractorId"] as string) || ctx?.contractorId || "",
        args["serviceId"] as string,
        args["dateFrom"] as string,
        args["dateTo"] as string,
      );
    }

    case "create_booking": {
      return createBooking({
        contractorId: (args["contractorId"] as string) || ctx?.contractorId || "",
        customerId: (args["customerId"] as string) || ctx?.customerId || "",
        serviceId: args["serviceId"] as string,
        conversationId: (args["conversationId"] as string) || ctx?.conversationId || "",
        startsAt: args["startsAt"] as string,
        notes: (args["notes"] as string) ?? "",
      });
    }

    case "cancel_booking": {
      return cancelBooking(
        args["bookingId"] as string,
        (args["customerId"] as string) || ctx?.customerId || "",
      );
    }

    case "handoff_to_human": {
      return handoffToHuman({
        conversationId: (args["conversationId"] as string) || ctx?.conversationId || "",
        contractorId: (args["contractorId"] as string) || ctx?.contractorId || "",
        reason: (args["reason"] as string) || "Customer requested human specialist.",
      });
    }

    case "identify_customer": {
      const contractorId = ctx?.contractorId || "";
      const conversationId = ctx?.conversationId || "";
      const customerId = ctx?.customerId || "";

      return identifyCustomer(contractorId, conversationId, customerId, {
        name: args["name"] as string | undefined,
        email: args["email"] as string | undefined,
        phone: args["phone"] as string | undefined,
      });
    }

    default:
      return { error: `Unknown tool: "${toolName}".` };
  }
}

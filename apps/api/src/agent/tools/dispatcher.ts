import {
  listServices,
  getAvailability,
  createBooking,
  cancelBooking,
  handoffToHuman,
} from "./executors.js";

type ToolResult = Record<string, unknown>;

/**
 * Dispatches a tool call from the OpenAI agent to the correct executor.
 * Returns a JSON-serializable result or an error object.
 */
export async function dispatchToolCall(
  toolName: string,
  rawArgs: string,
): Promise<ToolResult> {
  let args: Record<string, unknown>;

  try {
    args = JSON.parse(rawArgs) as Record<string, unknown>;
  } catch {
    return { error: `Invalid JSON arguments for tool "${toolName}".` };
  }

  switch (toolName) {
    case "list_services": {
      const contractorId = args["contractorId"] as string;
      return listServices(contractorId);
    }

    case "get_availability": {
      return getAvailability(
        args["contractorId"] as string,
        args["serviceId"] as string,
        args["dateFrom"] as string,
        args["dateTo"] as string,
      );
    }

    case "create_booking": {
      return createBooking({
        contractorId: args["contractorId"] as string,
        customerId: args["customerId"] as string,
        serviceId: args["serviceId"] as string,
        conversationId: args["conversationId"] as string,
        startsAt: args["startsAt"] as string,
        notes: (args["notes"] as string) ?? "",
      });
    }

    case "cancel_booking": {
      return cancelBooking(
        args["bookingId"] as string,
        args["customerId"] as string,
      );
    }

    case "handoff_to_human": {
      return handoffToHuman({
        conversationId: args["conversationId"] as string,
        contractorId: args["contractorId"] as string,
        reason: args["reason"] as string,
      });
    }

    default:
      return { error: `Unknown tool: "${toolName}".` };
  }
}

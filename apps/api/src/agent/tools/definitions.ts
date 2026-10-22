import type OpenAI from "openai";

/**
 * All tool definitions exposed to the OpenAI agent.
 * Each entry maps 1-to-1 to an executor in ./executors.ts.
 */
export const AGENT_TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_services",
      description:
        "Returns all active services offered by the contractor (name, description, price, duration).",
      parameters: {
        type: "object",
        properties: {
          contractorId: {
            type: "string",
            description: "UUID of the contractor whose services to list.",
          },
        },
        required: ["contractorId"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_availability",
      description:
        "Returns available time slots for a given service and date range. Use this before creating a booking to confirm the slot is free.",
      parameters: {
        type: "object",
        properties: {
          contractorId: {
            type: "string",
            description: "UUID of the contractor.",
          },
          serviceId: {
            type: "string",
            description: "UUID of the service the customer wants to book.",
          },
          dateFrom: {
            type: "string",
            description: "Start of the search window in ISO 8601 format (e.g. 2025-01-15T00:00:00Z).",
          },
          dateTo: {
            type: "string",
            description: "End of the search window in ISO 8601 format (e.g. 2025-01-20T23:59:59Z).",
          },
        },
        required: ["contractorId", "serviceId", "dateFrom", "dateTo"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description:
        "Creates a confirmed booking for the customer. Always call get_availability first to ensure the slot is available.",
      parameters: {
        type: "object",
        properties: {
          contractorId: {
            type: "string",
            description: "UUID of the contractor.",
          },
          customerId: {
            type: "string",
            description: "UUID of the customer.",
          },
          serviceId: {
            type: "string",
            description: "UUID of the service to book.",
          },
          conversationId: {
            type: "string",
            description: "UUID of the current conversation (for traceability).",
          },
          startsAt: {
            type: "string",
            description: "Booking start time in ISO 8601 format.",
          },
          notes: {
            type: "string",
            description: "Optional notes from the customer.",
          },
        },
        required: ["contractorId", "customerId", "serviceId", "conversationId", "startsAt", "notes"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_booking",
      description: "Cancels an existing booking by its ID.",
      parameters: {
        type: "object",
        properties: {
          bookingId: {
            type: "string",
            description: "UUID of the booking to cancel.",
          },
          customerId: {
            type: "string",
            description: "UUID of the customer requesting the cancellation (for ownership check).",
          },
        },
        required: ["bookingId", "customerId"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "handoff_to_human",
      description:
        "Escalates the conversation to a human agent when the customer's request is too complex, the customer is frustrated, or the agent cannot resolve the issue.",
      parameters: {
        type: "object",
        properties: {
          conversationId: {
            type: "string",
            description: "UUID of the current conversation.",
          },
          contractorId: {
            type: "string",
            description: "UUID of the contractor.",
          },
          reason: {
            type: "string",
            description: "A brief explanation of why the conversation is being escalated.",
          },
        },
        required: ["conversationId", "contractorId", "reason"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

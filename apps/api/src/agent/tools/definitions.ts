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
        "Returns free slots for a service. Business hours are 09:00–18:00 in the contractor timezone. A window of 36 hours or less is the full local calendar day, so 10:00 UTC still includes 10:00 local. Tell the customer localStart. Pass startsAt to create_booking only after they accept that exact time.",
      parameters: {
        type: "object",
        properties: {
          contractorId: {
            type: "string",
            description: "UUID of the contractor.",
          },
          serviceId: {
            type: "string",
            description: "UUID of the service. Use an empty string when you pass serviceName.",
          },
          serviceName: {
            type: "string",
            description: "Exact catalog name, such as Haircut & Styling. Required when serviceId is empty.",
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
        required: ["contractorId", "serviceId", "serviceName", "dateFrom", "dateTo"],
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
        "Creates one confirmed booking for a startsAt the customer explicitly requested or accepted. If that time is busy or outside business hours, do not book another time. Offer up to 3 localStart alternatives and wait.",
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
            description: "UUID of the service. Use an empty string when you pass serviceName.",
          },
          serviceName: {
            type: "string",
            description: "Exact catalog name, such as Haircut & Styling.",
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
        required: ["contractorId", "customerId", "serviceId", "serviceName", "conversationId", "startsAt", "notes"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "list_customer_bookings",
      description:
        "Lists this customer's upcoming appointments. Use the id only inside cancel_booking. Describe each appointment to the customer by serviceName and localStart.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "UUID of the customer.",
          },
          contractorId: {
            type: "string",
            description: "UUID of the contractor.",
          },
        },
        required: ["customerId", "contractorId"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_booking",
      description:
        "Cancels one upcoming appointment after the customer confirms that cancellation. Find the id with list_customer_bookings. Do not ask the customer for an id.",
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
  {
    type: "function",
    function: {
      name: "identify_customer",
      description:
        "Seamlessly records or updates the customer's name, email, or phone number in their profile. Call this as soon as the customer mentions who they are or provides contact info.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Customer full name.",
          },
          email: {
            type: "string",
            description: "Customer email address.",
          },
          phone: {
            type: "string",
            description: "Customer phone number.",
          },
        },
        required: ["name", "email", "phone"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

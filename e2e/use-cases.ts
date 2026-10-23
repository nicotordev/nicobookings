export type UseCaseActor = "customer" | "admin";

export type UseCase = {
  readonly id: string;
  readonly actor: UseCaseActor;
  readonly name: string;
  readonly input: string;
  readonly expected: string;
  readonly steps: readonly string[];
};

/**
 * Registered customer journeys.
 * `e2e/query.ts register` upserts these rows into AgentTestCase.
 */
export const USE_CASES = [
  {
    id: "customer.open-chat",
    actor: "customer",
    name: "Abrir el chat y empezar de nuevo",
    input: "Abrir el widget y pulsar nueva conversación.",
    expected: "Se ven las sugerencias y el campo de mensaje queda vacío.",
    steps: [
      "Abrir el chat del contratista",
      "Comprobar las sugerencias",
      "Iniciar una conversación nueva",
    ],
  },
  {
    id: "customer.list-services",
    actor: "customer",
    name: "Consultar servicios y precios",
    input: "What services do you offer and what are your rates?",
    expected: "La respuesta está en inglés y nombra Haircut & Styling.",
    steps: ["Elegir la sugerencia Services & Pricing", "Leer la respuesta del asistente"],
  },
  {
    id: "customer.identify",
    actor: "customer",
    name: "Identificarse en el chat",
    input: "My name is Camila Prado and this is my email.",
    expected: "El perfil del cliente queda guardado y el encabezado muestra el nombre.",
    steps: ["Enviar nombre, correo y teléfono", "Ver el nombre en el encabezado"],
  },
  {
    id: "customer.update-contact",
    actor: "customer",
    name: "Actualizar datos de contacto",
    input: "My name is Camila Soto. Here is my new email and phone.",
    expected: "Nombre, correo y teléfono actualizados quedan en el perfil.",
    steps: [
      "Abrir Identify y guardar nombre y correo nuevos",
      "Pedir el cambio de teléfono en el chat",
    ],
  },
  {
    id: "customer.create-booking",
    actor: "customer",
    name: "Crear una reserva",
    input: "I would like Haircut & Styling at 10:00 AM on a specific day. Yes, please book that time.",
    expected: "La reserva CONFIRMED empieza exactamente a las 10:00 hora local del contratista.",
    steps: ["Pedir Haircut & Styling a las 10:00", "Aceptar esa hora si el asistente la confirma"],
  },
  {
    id: "customer.reschedule-booking",
    actor: "customer",
    name: "Reprogramar una reserva",
    input: "Please move my Haircut & Styling to 4:00 PM on another day. Yes, I confirm that time.",
    expected: "La reserva anterior queda CANCELLED y la nueva empieza a las 16:00 hora local.",
    steps: ["Pedir el cambio a las 16:00", "Confirmar esa hora"],
  },
  {
    id: "customer.cancel-booking",
    actor: "customer",
    name: "Cancelar una reserva",
    input: "Please cancel my Haircut & Styling. Yes, cancel it.",
    expected: "La reserva activa queda CANCELLED.",
    steps: ["Pedir la cancelación", "Confirmar"],
  },
  {
    id: "customer.escalate",
    actor: "customer",
    name: "Pedir un especialista humano",
    input: "I need to speak with a person about a duplicate charge.",
    expected: "La conversación pasa a HUMAN_HANDOFF y aparece el aviso de soporte.",
    steps: ["Describir el reclamo", "Pedir una persona"],
  },
  {
    id: "customer.message-during-handoff",
    actor: "customer",
    name: "Escribir mientras espera al especialista",
    input: "I am still here. The duplicate charge was 40 dollars.",
    expected: "El mensaje queda en el hilo y el aviso de soporte sigue visible.",
    steps: ["Escribir en el chat ya escalado"],
  },
] as const satisfies readonly UseCase[];

export function useCase(id: (typeof USE_CASES)[number]["id"]): UseCase {
  const found = USE_CASES.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown use case: ${id}`);
  }
  return found;
}

export function useCaseTitle(id: (typeof USE_CASES)[number]["id"]): string {
  const item = useCase(id);
  return `${item.id}: ${item.name}`;
}

export type CustomerLanguage = "English" | "Spanish";

const SPANISH_WORD =
  /\b(el|la|los|las|una|unos|para|por|con|gracias|quieres|horario|reserva|disponibilidad|minutos|ofrecemos|siguientes|gustaria|gustaría|cita|hola|tu)\b/gi;
const ENGLISH_WORD =
  /\b(the|and|you|your|for|with|appointment|available|would|please|minutes|service|book|offer|following|what|like)\b/gi;

/** Language of the customer's latest message. English wins when the text is mixed or unmarked. */
export function detectCustomerLanguage(text: string): CustomerLanguage {
  const spanishMarks = /[áéíóúñ¿¡]/i.test(text);
  const spanishWords =
    text.match(/\b(hola|gracias|quiero|por favor|reserva|turno|cita|disponibilidad|servicios|nombre|correo)\b/gi)
      ?.length ?? 0;
  const englishWords =
    text.match(/\b(the|what|please|my|book|email|name|appointment|services|rates|cancel|would|like|update)\b/gi)
      ?.length ?? 0;
  if (spanishMarks && spanishWords >= englishWords) return "Spanish";
  if (spanishWords > englishWords) return "Spanish";
  return "English";
}

export function replyMismatchesLanguage(reply: string, language: CustomerLanguage): boolean {
  const spanish = reply.match(SPANISH_WORD)?.length ?? 0;
  const english = reply.match(ENGLISH_WORD)?.length ?? 0;
  if (language === "English") {
    return /[áéíóúñ¿¡]/i.test(reply) || (spanish >= 3 && spanish > english);
  }
  return english >= 4 && english > spanish && !/[áéíóúñ¿¡]/i.test(reply);
}

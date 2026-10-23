import { describe, expect, test } from "bun:test";
import { detectCustomerLanguage, replyMismatchesLanguage } from "./reply-language.ts";

describe("reply language", () => {
  test("an English booking request stays English", () => {
    const message = "What services do you offer and what are your rates?";
    expect(detectCustomerLanguage(message)).toBe("English");
    const spanish =
      "Ofrecemos los siguientes servicios: Consulta, duración de 30 minutos. ¿Te gustaría saber la disponibilidad?";
    expect(replyMismatchesLanguage(spanish, "English")).toBe(true);
  });

  test("a Spanish request is not rewritten into English", () => {
    expect(detectCustomerLanguage("Hola, quiero reservar un turno para mañana.")).toBe("Spanish");
    expect(replyMismatchesLanguage("Claro, ¿qué día prefieres?", "Spanish")).toBe(false);
  });
});

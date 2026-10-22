import "./style.css";
import { withAuth } from "./auth";

const statusLabel = document.querySelector<HTMLSpanElement>("#api-status");
const statusDot = document.querySelector<HTMLSpanElement>("#api-dot");
const currentDate = document.querySelector<HTMLParagraphElement>("#current-date");

void withAuth(async () => {
  if (!statusLabel || !statusDot || !currentDate) {
    throw new Error("Could not find required admin dashboard elements.");
  }

  currentDate.textContent = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date()).toLocaleUpperCase("es");

  try {
    const response = await fetch("/api/health");

    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}.`);
    }

    const health: { status: string } = await response.json();
    statusLabel.textContent = health.status === "ok" ? "API conectada" : "API no disponible";
    statusDot.classList.add(health.status === "ok" ? "online" : "offline");
  } catch {
    statusLabel.textContent = "API no disponible";
    statusDot.classList.add("offline");
  }
});

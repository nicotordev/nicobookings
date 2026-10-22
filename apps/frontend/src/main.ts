import "./style.css";

const status = document.querySelector<HTMLParagraphElement>("#api-status");

if (!status) {
  throw new Error("Could not find the API status element.");
}

try {
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error(`API returned HTTP ${response.status}.`);
  }

  const health: { status: string } = await response.json();
  status.textContent = `API status: ${health.status}`;
} catch (error) {
  status.textContent = `API unavailable: ${error instanceof Error ? error.message : String(error)}`;
}

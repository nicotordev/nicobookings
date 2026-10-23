import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(import.meta.dirname, "../apps/api/.env");

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Loads apps/api/.env into the current process without printing values. */
export function loadApiEnv(): void {
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = unquote(trimmed.slice(separator + 1));
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function requireEnv(name: string): string {
  loadApiEnv();
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing from apps/api/.env`);
  }
  return value;
}

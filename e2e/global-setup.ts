import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

export default function globalSetup(): void {
  execFileSync("bun", ["e2e/query.ts", "register"], {
    cwd: root,
    stdio: "inherit",
  });
}

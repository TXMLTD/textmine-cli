import type { Command } from "commander";
import { createClient } from "../lib/client-factory.js";
import { pickGlobals } from "../lib/context.js";
import { printLine, printResult } from "../lib/output.js";

export function registerApi(program: Command): void {
  const api = program.command("api").description("Diagnostics against the API");

  api
    .command("ping")
    .description("Check Public API V3 health (GET /v3/_ping)")
    .action(async (_opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<Record<string, unknown>>("/_ping");
      printResult(data, () => {
        const status = data?.status ?? "unknown";
        const version = data?.version ?? "?";
        printLine(`ok — status=${status} version=${version}`);
      });
    });
}

import type { Command } from "commander";
import { ApiClient } from "../lib/api-client.js";
import { pickGlobals, resolveContext } from "../lib/context.js";
import { AuthError } from "../lib/errors.js";
import { printLine, printResult } from "../lib/output.js";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Run environment and connectivity diagnostics")
    .action(async (_opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const checks: Check[] = [];

      const ctx = resolveContext(flags);
      checks.push({
        name: "profile",
        ok: true,
        detail: ctx.profileName,
      });
      checks.push({
        name: "base-url",
        ok: true,
        detail: ctx.baseUrl,
      });

      const hasKey = Boolean(ctx.apiKey);
      checks.push({
        name: "api-key",
        ok: hasKey,
        detail: hasKey ? "present" : "missing (run `textmine auth login`)",
      });

      if (hasKey) {
        const client = new ApiClient({
          baseUrl: ctx.baseUrl,
          apiKey: ctx.apiKey!,
        });
        try {
          await client.request("/_ping");
          checks.push({ name: "connectivity", ok: true, detail: "reachable & authenticated" });
        } catch (err) {
          checks.push({
            name: "connectivity",
            ok: false,
            detail:
              err instanceof AuthError
                ? "API key rejected"
                : asMessage(err),
          });
        }
      } else {
        checks.push({
          name: "connectivity",
          ok: false,
          detail: "skipped (no API key)",
        });
      }

      const allOk = checks.every((c) => c.ok);
      printResult({ ok: allOk, checks }, () => {
        for (const c of checks) {
          printLine(`${c.ok ? "✓" : "✗"} ${c.name.padEnd(13)} ${c.detail}`);
        }
        printLine("");
        printLine(allOk ? "All checks passed." : "Some checks failed.");
      });

      if (!allOk) process.exitCode = 1;
    });
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

import type { Command } from "commander";
import { createClient } from "../lib/client-factory.js";
import { pickGlobals } from "../lib/context.js";
import { printLine, printResult, printTable } from "../lib/output.js";

interface VaultLike {
  id?: number | string;
  name?: string;
  description?: string;
  documentCount?: number;
  team?: { name?: string };
}

/** The list endpoint nests the name under `team`; get/create return it flat. */
function vaultName(v: VaultLike): string | undefined {
  return v.name ?? v.team?.name;
}

export function registerVaults(program: Command): void {
  const vaults = program.command("vaults").description("Manage vaults");

  vaults
    .command("list")
    .description("List vaults for the authenticated key (GET /v3/vaults)")
    .action(async (_opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<{ vaults?: VaultLike[] }>("/vaults");
      const items = data?.vaults ?? [];
      printResult(data, () => {
        const rows = items.map((v) => ({
          id: v.id ?? "",
          name: vaultName(v) ?? "",
          documents: v.documentCount ?? "",
        }));
        printTable(rows, ["id", "name", "documents"]);
      });
    });

  vaults
    .command("get <vaultId>")
    .description("Fetch a vault by id (GET /v3/vaults/{vaultId})")
    .action(async (vaultId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<VaultLike>(`/vaults/${encodeURIComponent(vaultId)}`);
      printResult(data, () => {
        printLine(`id:           ${data.id ?? ""}`);
        printLine(`name:         ${vaultName(data) ?? ""}`);
        if (data.description) printLine(`description:  ${data.description}`);
        if (data.documentCount !== undefined) {
          printLine(`documents:    ${data.documentCount}`);
        }
      });
    });

  vaults
    .command("create <name>")
    .description("Create a vault (POST /v3/vaults)")
    .option("--description <text>", "Optional vault description")
    .action(async (name: string, opts: { description?: string }, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const body: Record<string, unknown> = { name };
      if (opts.description) body.description = opts.description;
      const data = await client.request<VaultLike>("/vaults", {
        method: "POST",
        body,
      });
      printResult(data, () =>
        printLine(`Created vault "${vaultName(data) ?? name}" (id: ${data.id ?? "?"}).`),
      );
    });
}

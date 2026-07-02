import type { Command } from "commander";
import { createClient } from "../lib/client-factory.js";
import { pickGlobals } from "../lib/context.js";
import { printLine, printResult, printTable } from "../lib/output.js";

/** Document type as returned by the API (camelCase fields). */
interface DocumentTypeLike {
  id?: number | string;
  name?: string;
  code?: string;
  vaultId?: number | string;
  alternativeNames?: string[];
}

const encode = encodeURIComponent;

export function registerDocumentTypes(program: Command): void {
  const documentTypes = program
    .command("document-types")
    .description("Manage document types");

  documentTypes
    .command("list")
    .description("List document types (GET /v3/document-types)")
    .action(async (_opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<{ items?: DocumentTypeLike[] }>("/document-types");
      const items = data?.items ?? [];
      printResult(data, () => {
        const rows = items.map((t) => ({
          id: t.id ?? "",
          name: t.name ?? "",
          code: t.code ?? "",
          vault: t.vaultId ?? "",
        }));
        printTable(rows, ["id", "name", "code", "vault"]);
      });
    });

  documentTypes
    .command("get <documentTypeId>")
    .description("Fetch a document type by id (GET /v3/document-types/{documentTypeId})")
    .action(async (documentTypeId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<DocumentTypeLike>(
        `/document-types/${encode(documentTypeId)}`,
      );
      printResult(data, () => {
        printLine(`id:    ${data.id ?? ""}`);
        printLine(`name:  ${data.name ?? ""}`);
        if (data.code) printLine(`code:  ${data.code}`);
        if (data.vaultId !== undefined) printLine(`vault: ${data.vaultId}`);
        if (data.alternativeNames && data.alternativeNames.length > 0) {
          printLine(`aliases: ${data.alternativeNames.join(", ")}`);
        }
      });
    });

  documentTypes
    .command("create <name>")
    .description("Create a document type (POST /v3/document-types)")
    .option("--vault <vaultId>", "Vault to scope the document type to")
    .action(async (name: string, opts: { vault?: string }, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const body: Record<string, unknown> = { name };
      if (opts.vault) body.vaultId = opts.vault;
      const data = await client.request<DocumentTypeLike>("/document-types", {
        method: "POST",
        body,
      });
      printResult(data, () =>
        printLine(`Created document type "${data.name ?? name}" (id: ${data.id ?? "?"}).`),
      );
    });
}

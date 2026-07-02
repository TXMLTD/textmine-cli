import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Command } from "commander";
import { createClient } from "../lib/client-factory.js";
import { pickGlobals } from "../lib/context.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { printLine, printResult, printTable } from "../lib/output.js";

/** Document as returned by list/get/upload/rename (snake_case fields). */
interface DocumentLike {
  id?: number | string;
  name?: string;
  status?: string;
  vault_id?: number | string;
  document_type_id?: number | string;
  page_count?: number;
}

interface MetadataField {
  fieldId?: number | string;
  name?: string;
  value?: string;
  status?: string;
}

interface Tag {
  name?: string;
  question?: string;
  answer?: string;
  tag_id?: number | string;
  validation?: { is_valid?: boolean; validated_answer?: string };
}

const encode = encodeURIComponent;

export function registerDocuments(program: Command): void {
  const documents = program
    .command("documents")
    .aliases(["docs"])
    .description("Manage documents");

  documents
    .command("list")
    .description("List documents in a vault (GET /v3/documents)")
    .requiredOption("--vault <vaultId>", "Vault to list documents from")
    .action(async (opts: { vault: string }, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<{ items?: DocumentLike[] }>("/documents", {
        query: { vault_id: opts.vault },
      });
      const items = data?.items ?? [];
      printResult(data, () => {
        const rows = items.map((d) => ({
          id: d.id ?? "",
          name: d.name ?? "",
          status: d.status ?? "",
          type: d.document_type_id ?? "",
          pages: d.page_count ?? "",
        }));
        printTable(rows, ["id", "name", "status", "type", "pages"]);
      });
    });

  documents
    .command("upload <file>")
    .description("Upload a document (POST /v3/documents)")
    .option("--vault <vaultId>", "Vault to upload the document into")
    .option("--document-type <documentTypeId>", "Document type to assign")
    .action(
      async (
        file: string,
        opts: { vault?: string; documentType?: string },
        cmd: Command,
      ) => {
        const flags = pickGlobals(cmd.optsWithGlobals());
        const client = createClient(flags);

        let buffer: Buffer;
        try {
          buffer = await readFile(file);
        } catch (err) {
          throw new CliError(`Could not read file "${file}".`, {
            exitCode: ExitCode.USAGE,
            hint: `Check the path exists and is readable. (${
              err instanceof Error ? err.message : String(err)
            })`,
          });
        }

        const form = new FormData();
        form.append(
          "file",
          new Blob([new Uint8Array(buffer)]),
          basename(file),
        );
        if (opts.vault) form.append("vault_id", opts.vault);
        if (opts.documentType) form.append("document_type_id", opts.documentType);

        const data = await client.request<DocumentLike>("/documents", {
          method: "POST",
          form,
        });
        printResult(data, () =>
          printLine(
            `Uploaded "${data.name ?? basename(file)}" (id: ${
              data.id ?? "?"
            }, status: ${data.status ?? "?"}).`,
          ),
        );
      },
    );

  documents
    .command("get <documentId>")
    .description("Fetch a document by id (GET /v3/documents/{documentId})")
    .action(async (documentId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<DocumentLike>(`/documents/${encode(documentId)}`);
      printResult(data, () => printDocument(data));
    });

  documents
    .command("text <documentId>")
    .description("Fetch extracted text (GET /v3/documents/{documentId}/text)")
    .action(async (documentId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<{ status?: string; text?: string }>(
        `/documents/${encode(documentId)}/text`,
      );
      printResult(data, () => printLine(data.text ?? ""));
    });

  documents
    .command("metadata <documentId>")
    .description("Fetch extracted metadata fields (GET /v3/documents/{documentId}/metadata)")
    .action(async (documentId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<MetadataField[]>(
        `/documents/${encode(documentId)}/metadata`,
      );
      const fields = Array.isArray(data) ? data : [];
      printResult(data, () => {
        const rows = fields.map((f) => ({
          field: f.name ?? "",
          value: f.value ?? "",
          status: f.status ?? "",
        }));
        printTable(rows, ["field", "value", "status"]);
      });
    });

  documents
    .command("tags <documentId>")
    .description("Fetch document tags (GET /v3/documents/{documentId}/tags)")
    .action(async (documentId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<{ status?: string; tags?: Tag[] }>(
        `/documents/${encode(documentId)}/tags`,
      );
      const tags = data?.tags ?? [];
      printResult(data, () => {
        const rows = tags.map((t) => ({
          tag: t.name ?? t.question ?? "",
          answer: t.answer ?? "",
          valid: t.validation?.is_valid === undefined ? "" : String(t.validation.is_valid),
        }));
        printTable(rows, ["tag", "answer", "valid"]);
      });
    });

  documents
    .command("download-url <documentId>")
    .description("Get a temporary download URL (GET /v3/documents/{documentId}/download-url)")
    .action(async (documentId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<{
        filename?: string;
        download_url?: string;
        expires_in_seconds?: number;
      }>(`/documents/${encode(documentId)}/download-url`);
      printResult(data, () => {
        printLine(data.download_url ?? "");
        if (data.expires_in_seconds !== undefined) {
          printLine(`(expires in ${data.expires_in_seconds}s)`);
        }
      });
    });

  documents
    .command("rename <documentId> <name>")
    .description("Rename a document (PATCH /v3/documents/{documentId})")
    .action(async (documentId: string, name: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<DocumentLike>(`/documents/${encode(documentId)}`, {
        method: "PATCH",
        body: { name },
      });
      printResult(data, () =>
        printLine(`Renamed document ${data.id ?? documentId} to "${data.name ?? name}".`),
      );
    });

  documents
    .command("reprocess <documentId>")
    .description("Reprocess a document (POST /v3/documents/{documentId}/reprocess)")
    .action(async (documentId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<DocumentLike>(
        `/documents/${encode(documentId)}/reprocess`,
        { method: "POST" },
      );
      printResult(data, () =>
        printLine(
          `Reprocessing document ${data.id ?? documentId} (status: ${data.status ?? "?"}).`,
        ),
      );
    });
}

function printDocument(d: DocumentLike): void {
  printLine(`id:            ${d.id ?? ""}`);
  printLine(`name:          ${d.name ?? ""}`);
  printLine(`status:        ${d.status ?? ""}`);
  if (d.vault_id !== undefined) printLine(`vault:         ${d.vault_id}`);
  if (d.document_type_id !== undefined) printLine(`document type: ${d.document_type_id}`);
  if (d.page_count !== undefined) printLine(`pages:         ${d.page_count}`);
}

import { Command } from "commander";
import { registerApi } from "./commands/api.js";
import { registerAuth } from "./commands/auth.js";
import { registerConfig } from "./commands/config.js";
import { registerDoctor } from "./commands/doctor.js";
import { registerDocumentTypes } from "./commands/document-types.js";
import { registerDocuments } from "./commands/documents.js";
import { registerProfile } from "./commands/profile.js";
import { registerTasks } from "./commands/tasks.js";
import { registerVaults } from "./commands/vaults.js";
import { CliError } from "./lib/errors.js";
import { isJsonMode, printNote, setJsonMode } from "./lib/output.js";

const VERSION = "0.1.0";

function buildProgram(): Command {
  const program = new Command();

  program
    .name("textmine")
    .description("Direct, scriptable REST client for the TextMine Public API V3.")
    .version(VERSION, "-v, --version", "Print the CLI version")
    .option("--profile <name>", "Profile to use for this command")
    .option("--base-url <url>", "Override the API base URL for this command")
    .option("--api-key <key>", "Override the API key for this command")
    .option("--json", "Emit machine-readable JSON instead of human output")
    .hook("preAction", (thisCommand) => {
      setJsonMode(thisCommand.opts().json === true);
    });

  registerAuth(program);
  registerProfile(program);
  registerConfig(program);
  registerApi(program);
  registerDoctor(program);
  registerVaults(program);
  registerDocuments(program);
  registerDocumentTypes(program);
  registerTasks(program);

  return program;
}

async function main(): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    reportError(err);
  }
}

function reportError(err: unknown): void {
  if (err instanceof CliError) {
    if (isJsonMode()) {
      process.stdout.write(
        `${JSON.stringify({ error: err.message, hint: err.hint ?? null }, null, 2)}\n`,
      );
    } else {
      printNote(`Error: ${err.message}`);
      if (err.hint) printNote(`Hint:  ${err.hint}`);
    }
    process.exit(err.exitCode);
  }

  // Unexpected error: surface the message and a stack when DEBUG is set.
  const message = err instanceof Error ? err.message : String(err);
  printNote(`Unexpected error: ${message}`);
  if (process.env.DEBUG && err instanceof Error && err.stack) {
    printNote(err.stack);
  }
  process.exit(1);
}

void main();

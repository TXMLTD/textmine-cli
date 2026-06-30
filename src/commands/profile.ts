import type { Command } from "commander";
import {
  loadConfig,
  profileBaseUrl,
  requireProfile,
  saveConfig,
} from "../lib/config-store.js";
import { DEFAULT_PROFILE } from "../lib/constants.js";
import { pickGlobals } from "../lib/context.js";
import { deleteApiKey, hasApiKey } from "../lib/credentials.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { printLine, printResult, printTable } from "../lib/output.js";
import { normalizeBaseUrl } from "../lib/url.js";

export function registerProfile(program: Command): void {
  const profile = program
    .command("profile")
    .description("Manage profiles (base URL + API key per environment)");

  profile
    .command("list")
    .description("List configured profiles")
    .action(() => {
      const conf = loadConfig();
      const rows = Object.entries(conf.profiles).map(([name, p]) => ({
        active: name === conf.activeProfile ? "*" : "",
        name,
        baseUrl: profileBaseUrl(p),
        authenticated: hasApiKey(name) ? "yes" : "no",
      }));
      printResult(
        { activeProfile: conf.activeProfile, profiles: rows },
        () => printTable(rows, ["active", "name", "baseUrl", "authenticated"]),
      );
    });

  profile
    .command("use <name>")
    .description("Switch the active profile")
    .action((name: string) => {
      const conf = loadConfig();
      requireProfile(conf, name);
      conf.activeProfile = name;
      saveConfig(conf);
      printResult({ activeProfile: name }, () =>
        printLine(`Active profile is now "${name}".`),
      );
    });

  profile
    .command("add <name>")
    .description("Create a new profile (use --base-url to set its API base URL)")
    .action((name: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const conf = loadConfig();
      if (conf.profiles[name]) {
        throw new CliError(`Profile "${name}" already exists.`, {
          exitCode: ExitCode.USAGE,
        });
      }
      conf.profiles[name] = flags.baseUrl
        ? { baseUrl: normalizeBaseUrl(flags.baseUrl) }
        : {};
      saveConfig(conf);
      printResult(
        { name, baseUrl: profileBaseUrl(conf.profiles[name]!) },
        () =>
          printLine(
            `Created profile "${name}" (base-url: ${profileBaseUrl(conf.profiles[name]!)}).`,
          ),
      );
    });

  profile
    .command("remove <name>")
    .description("Delete a profile and its stored API key")
    .action((name: string) => {
      if (name === DEFAULT_PROFILE) {
        throw new CliError(`The "${DEFAULT_PROFILE}" profile cannot be removed.`, {
          exitCode: ExitCode.USAGE,
        });
      }
      const conf = loadConfig();
      requireProfile(conf, name);
      delete conf.profiles[name];
      if (conf.activeProfile === name) {
        conf.activeProfile = DEFAULT_PROFILE;
      }
      saveConfig(conf);
      deleteApiKey(name);
      printResult({ removed: name, activeProfile: conf.activeProfile }, () =>
        printLine(`Removed profile "${name}".`),
      );
    });
}

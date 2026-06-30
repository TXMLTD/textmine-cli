import type { Command } from "commander";
import {
  loadConfig,
  requireProfile,
  saveConfig,
} from "../lib/config-store.js";
import { DEFAULT_BASE_URL } from "../lib/constants.js";
import { pickGlobals } from "../lib/context.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { printLine, printResult } from "../lib/output.js";
import { normalizeBaseUrl } from "../lib/url.js";

const SUPPORTED_KEYS = ["base-url"] as const;
type ConfigKey = (typeof SUPPORTED_KEYS)[number];

function assertKey(key: string): ConfigKey {
  if (!SUPPORTED_KEYS.includes(key as ConfigKey)) {
    throw new CliError(`Unknown config key "${key}".`, {
      exitCode: ExitCode.USAGE,
      hint: `Supported keys: ${SUPPORTED_KEYS.join(", ")}.`,
    });
  }
  return key as ConfigKey;
}

export function registerConfig(program: Command): void {
  const config = program
    .command("config")
    .description("Get, set, or reset CLI configuration for the active profile");

  config
    .command("get <key>")
    .description("Read a config value (e.g. base-url)")
    .action((key: string, _opts, cmd: Command) => {
      assertKey(key);
      const flags = pickGlobals(cmd.optsWithGlobals());
      const conf = loadConfig();
      const profileName = flags.profile ?? conf.activeProfile;
      const profile = requireProfile(conf, profileName);
      const value = profile.baseUrl ?? normalizeBaseUrl(DEFAULT_BASE_URL);
      printResult({ key, value, profile: profileName }, () => printLine(value));
    });

  config
    .command("set <key> <value>")
    .description("Set a config value (e.g. base-url https://...)")
    .action((key: string, value: string, _opts, cmd: Command) => {
      assertKey(key);
      const flags = pickGlobals(cmd.optsWithGlobals());
      const conf = loadConfig();
      const profileName = flags.profile ?? conf.activeProfile;
      const profile = requireProfile(conf, profileName);
      profile.baseUrl = normalizeBaseUrl(value);
      saveConfig(conf);
      printResult(
        { key, value: profile.baseUrl, profile: profileName },
        () => printLine(`Set base-url = ${profile.baseUrl} (profile: ${profileName})`),
      );
    });

  config
    .command("reset <key>")
    .description("Reset a config value to its built-in default")
    .action((key: string, _opts, cmd: Command) => {
      assertKey(key);
      const flags = pickGlobals(cmd.optsWithGlobals());
      const conf = loadConfig();
      const profileName = flags.profile ?? conf.activeProfile;
      const profile = requireProfile(conf, profileName);
      delete profile.baseUrl;
      saveConfig(conf);
      const effective = normalizeBaseUrl(DEFAULT_BASE_URL);
      printResult(
        { key, value: effective, profile: profileName },
        () => printLine(`Reset base-url to default ${effective} (profile: ${profileName})`),
      );
    });
}

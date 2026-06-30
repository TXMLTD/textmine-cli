import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { DEFAULT_BASE_URL, DEFAULT_PROFILE } from "./constants.js";
import { CliError } from "./errors.js";
import { configDir, configPath } from "./paths.js";
import { normalizeBaseUrl } from "./url.js";

export interface ProfileConfig {
  /** Normalized base URL (ends in `/v3`). Omitted means use the built-in default. */
  baseUrl?: string;
}

export interface CliConfig {
  activeProfile: string;
  profiles: Record<string, ProfileConfig>;
}

function emptyConfig(): CliConfig {
  return {
    activeProfile: DEFAULT_PROFILE,
    profiles: { [DEFAULT_PROFILE]: {} },
  };
}

/** Load config from disk, returning a fresh default config if none exists. */
export function loadConfig(): CliConfig {
  const path = configPath();
  if (!existsSync(path)) {
    return emptyConfig();
  }
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new CliError(`Could not read config at ${path}: ${asMessage(err)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError(
      `Config file is not valid JSON: ${path}`,
      { hint: "Fix or delete the file, then run a command again." },
    );
  }
  return normalizeConfig(parsed);
}

/** Persist config to disk with strict (0600) permissions, creating dirs as needed. */
export function saveConfig(config: CliConfig): void {
  const dir = configDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = configPath();
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

function normalizeConfig(parsed: unknown): CliConfig {
  if (typeof parsed !== "object" || parsed === null) {
    return emptyConfig();
  }
  const obj = parsed as Record<string, unknown>;
  const profilesRaw =
    typeof obj.profiles === "object" && obj.profiles !== null
      ? (obj.profiles as Record<string, unknown>)
      : {};

  const profiles: Record<string, ProfileConfig> = {};
  for (const [name, value] of Object.entries(profilesRaw)) {
    const p = (typeof value === "object" && value !== null ? value : {}) as Record<
      string,
      unknown
    >;
    profiles[name] =
      typeof p.baseUrl === "string" ? { baseUrl: p.baseUrl } : {};
  }
  if (!profiles[DEFAULT_PROFILE]) {
    profiles[DEFAULT_PROFILE] = {};
  }

  const active =
    typeof obj.activeProfile === "string" && profiles[obj.activeProfile]
      ? obj.activeProfile
      : DEFAULT_PROFILE;

  return { activeProfile: active, profiles };
}

/** Get a profile, throwing a clear error if it does not exist. */
export function requireProfile(
  config: CliConfig,
  name: string,
): ProfileConfig {
  const profile = config.profiles[name];
  if (!profile) {
    throw new CliError(`Profile "${name}" does not exist.`, {
      hint: `Run "textmine profile add ${name}" or "textmine profile list".`,
    });
  }
  return profile;
}

/** The base URL for a profile, falling back to the built-in default. */
export function profileBaseUrl(profile: ProfileConfig): string {
  return profile.baseUrl ?? normalizeBaseUrl(DEFAULT_BASE_URL);
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

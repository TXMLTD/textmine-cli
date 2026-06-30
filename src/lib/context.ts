import {
  loadConfig,
  profileBaseUrl,
  requireProfile,
  type CliConfig,
} from "./config-store.js";
import {
  ENV_API_KEY,
  ENV_BASE_URL,
  ENV_PROFILE,
} from "./constants.js";
import { getApiKey } from "./credentials.js";
import { AuthError, CliError } from "./errors.js";
import { normalizeBaseUrl } from "./url.js";

/** Global flags shared by every command, parsed by commander at the root. */
export interface GlobalFlags {
  profile?: string;
  baseUrl?: string;
  apiKey?: string;
  json?: boolean;
}

export interface ResolvedContext {
  config: CliConfig;
  /** The profile name in effect (flag > env > config.activeProfile). */
  profileName: string;
  /** Normalized base URL ending in `/v3`. */
  baseUrl: string;
  /** API key if one could be resolved; undefined otherwise. */
  apiKey?: string;
}

/**
 * Resolve the runtime context from flags, environment, and config following the
 * precedence rules documented in the proposal.
 */
export function resolveContext(flags: GlobalFlags): ResolvedContext {
  const config = loadConfig();

  // Profile: flag > env > config.activeProfile
  const profileName =
    flags.profile ?? process.env[ENV_PROFILE]?.trim() ?? config.activeProfile;
  const profile = requireProfile(config, profileName);

  // Base URL: flag > env > profile/config > built-in default
  const baseUrlInput =
    flags.baseUrl ?? envValue(ENV_BASE_URL) ?? undefined;
  const baseUrl = baseUrlInput
    ? normalizeBaseUrl(baseUrlInput)
    : profileBaseUrl(profile);

  // API key: flag > env > stored key for profile
  const apiKey =
    flags.apiKey ?? envValue(ENV_API_KEY) ?? getApiKey(profileName);

  return { config, profileName, baseUrl, apiKey };
}

/** Resolve context and ensure an API key is present, or fail with AuthError. */
export function requireAuth(flags: GlobalFlags): Required<
  Pick<ResolvedContext, "apiKey">
> &
  ResolvedContext {
  const ctx = resolveContext(flags);
  if (!ctx.apiKey) {
    throw new AuthError(
      `No API key configured for profile "${ctx.profileName}".`,
      `Run "textmine auth login --profile ${ctx.profileName} --api-key tm_..." or set ${ENV_API_KEY}.`,
    );
  }
  return { ...ctx, apiKey: ctx.apiKey };
}

/** Extract the global flags from a commander opts object (with globals merged). */
export function pickGlobals(opts: Record<string, unknown>): GlobalFlags {
  return {
    profile: typeof opts.profile === "string" ? opts.profile : undefined,
    baseUrl: typeof opts.baseUrl === "string" ? opts.baseUrl : undefined,
    apiKey: typeof opts.apiKey === "string" ? opts.apiKey : undefined,
    json: opts.json === true,
  };
}

function envValue(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : undefined;
}

export { CliError };

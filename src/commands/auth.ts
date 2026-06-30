import type { Command } from "commander";
import { ApiClient } from "../lib/api-client.js";
import { saveConfig } from "../lib/config-store.js";
import { API_KEY_PREFIX, ENV_API_KEY } from "../lib/constants.js";
import {
  pickGlobals,
  resolveContext,
  type GlobalFlags,
} from "../lib/context.js";
import {
  deleteApiKey,
  getApiKey,
  setApiKey,
} from "../lib/credentials.js";
import { AuthError, CliError, ExitCode } from "../lib/errors.js";
import { printLine, printNote, printResult } from "../lib/output.js";

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 5)}…${key.slice(-4)}`;
}

export function registerAuth(program: Command): void {
  const auth = program.command("auth").description("Authenticate with TextMine");

  auth
    .command("login")
    .description("Store an API key for a profile and verify it (pass --api-key tm_...)")
    .action(async (_opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const apiKey = flags.apiKey ?? process.env[ENV_API_KEY];
      if (!apiKey) {
        throw new CliError("No API key provided.", {
          exitCode: ExitCode.USAGE,
          hint: 'Pass --api-key tm_... (e.g. "textmine auth login --api-key tm_...").',
        });
      }
      if (!apiKey.startsWith(API_KEY_PREFIX)) {
        printNote(
          `Warning: API keys normally start with "${API_KEY_PREFIX}". Continuing anyway.`,
        );
      }

      const ctx = resolveContext({ ...flags, apiKey });
      const client = new ApiClient({ baseUrl: ctx.baseUrl, apiKey });

      // Verify the key before persisting so we never store a key that the wrong
      // environment rejects.
      try {
        await client.request("/_ping");
      } catch (err) {
        if (err instanceof AuthError) {
          throw new AuthError(
            `The API key was rejected by ${ctx.baseUrl}.`,
            `Check that the key is valid and matches this environment. Key not saved.`,
          );
        }
        // Network or other transient failure: save anyway but warn.
        printNote(
          `Warning: could not verify the key against ${ctx.baseUrl} (${asMessage(err)}). Saving anyway.`,
        );
      }

      setApiKey(ctx.profileName, apiKey);

      // When --base-url is passed at login, persist it onto the profile so later
      // commands target the same environment instead of falling back to prod.
      if (flags.baseUrl) {
        const profile = ctx.config.profiles[ctx.profileName];
        if (profile) {
          profile.baseUrl = ctx.baseUrl;
          saveConfig(ctx.config);
        }
      }

      printResult(
        {
          profile: ctx.profileName,
          baseUrl: ctx.baseUrl,
          apiKey: maskKey(apiKey),
          status: "logged-in",
        },
        () =>
          printLine(
            `Logged in to profile "${ctx.profileName}" (${ctx.baseUrl}).`,
          ),
      );
    });

  auth
    .command("status")
    .description("Show the active profile and authentication state")
    .action((_opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const ctx = resolveContext(flags);
      const source = keySource(flags, ctx.profileName);
      const authenticated = Boolean(ctx.apiKey);
      printResult(
        {
          profile: ctx.profileName,
          baseUrl: ctx.baseUrl,
          authenticated,
          apiKey: ctx.apiKey ? maskKey(ctx.apiKey) : null,
          apiKeySource: source,
        },
        () => {
          printLine(`Profile:        ${ctx.profileName}`);
          printLine(`Base URL:       ${ctx.baseUrl}`);
          printLine(`Authenticated:  ${authenticated ? "yes" : "no"}`);
          if (ctx.apiKey) {
            printLine(`API key:        ${maskKey(ctx.apiKey)} (from ${source})`);
          } else {
            printLine(`API key:        none`);
            printLine(
              `\nRun "textmine auth login --api-key tm_..." to authenticate.`,
            );
          }
        },
      );
    });

  auth
    .command("logout")
    .description("Remove the stored API key for the active profile")
    .action((_opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const ctx = resolveContext(flags);
      const removed = deleteApiKey(ctx.profileName);
      printResult(
        { profile: ctx.profileName, removed },
        () =>
          printLine(
            removed
              ? `Removed stored API key for profile "${ctx.profileName}".`
              : `No stored API key for profile "${ctx.profileName}".`,
          ),
      );
    });
}

function keySource(flags: GlobalFlags, profileName: string): string {
  if (flags.apiKey) return "--api-key flag";
  if (process.env[ENV_API_KEY]?.trim()) return ENV_API_KEY;
  if (getApiKey(profileName)) return "stored profile key";
  return "none";
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

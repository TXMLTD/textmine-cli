import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { CliError } from "./errors.js";
import { configDir, credentialsPath } from "./paths.js";

/**
 * Per-profile API key storage.
 *
 * For V1 we store keys in a local file (`credentials.json`) with strict 0600
 * permissions, separate from the main config so secrets never live alongside
 * shareable settings. The interface here intentionally hides the backend so a
 * future OS-keychain implementation can be dropped in without touching callers.
 */

type CredentialsFile = Record<string, string>;

function load(): CredentialsFile {
  const path = credentialsPath();
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as CredentialsFile;
    }
    return {};
  } catch {
    throw new CliError(`Credentials file is corrupt: ${path}`, {
      hint: "Delete the file and re-run `textmine auth login`.",
    });
  }
}

function persist(creds: CredentialsFile): void {
  mkdirSync(configDir(), { recursive: true, mode: 0o700 });
  writeFileSync(credentialsPath(), `${JSON.stringify(creds, null, 2)}\n`, {
    mode: 0o600,
  });
}

export function getApiKey(profile: string): string | undefined {
  return load()[profile];
}

export function setApiKey(profile: string, apiKey: string): void {
  const creds = load();
  creds[profile] = apiKey;
  persist(creds);
}

export function deleteApiKey(profile: string): boolean {
  const creds = load();
  if (!(profile in creds)) return false;
  delete creds[profile];
  persist(creds);
  return true;
}

export function hasApiKey(profile: string): boolean {
  return getApiKey(profile) !== undefined;
}

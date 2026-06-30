import { API_VERSION } from "./constants.js";
import { CliError } from "./errors.js";

/**
 * Normalize a user-supplied base URL so it always resolves to the `/v3` root.
 *
 * All of these inputs collapse to `https://public-api.textmine.com/v3`:
 *   https://public-api.textmine.com
 *   https://public-api.textmine.com/
 *   https://public-api.textmine.com/v3
 *   https://public-api.textmine.com/v3/
 *
 * The returned value never has a trailing slash, so callers can safely append
 * `/documents`, `/vaults`, etc.
 */
export function normalizeBaseUrl(input: string): string {
  const raw = input.trim();
  if (!raw) {
    throw new CliError("Base URL cannot be empty.");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new CliError(`Invalid base URL: "${input}".`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CliError(
      `Base URL must use http or https, got "${parsed.protocol}".`,
    );
  }

  // Strip any query/hash — a base URL should carry neither.
  parsed.search = "";
  parsed.hash = "";

  // Split the path into non-empty segments and drop a trailing `/v3` if present
  // so we never end up with `.../v3/v3`.
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length > 0 && segments[segments.length - 1] === API_VERSION) {
    segments.pop();
  }
  segments.push(API_VERSION);

  const origin = `${parsed.protocol}//${parsed.host}`;
  return `${origin}/${segments.join("/")}`;
}

/** Join the normalized base URL with an API path (which must start with `/`). */
export function joinUrl(baseUrl: string, path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${suffix}`;
}

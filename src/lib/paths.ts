import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Resolve the CLI config directory, honoring XDG_CONFIG_HOME when set.
 * Defaults to `~/.config/textmine`.
 */
export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
  return join(base, "textmine");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function credentialsPath(): string {
  return join(configDir(), "credentials.json");
}

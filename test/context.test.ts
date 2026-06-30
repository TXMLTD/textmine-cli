import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveConfig } from "../src/lib/config-store.js";
import { setApiKey } from "../src/lib/credentials.js";
import { resolveContext } from "../src/lib/context.js";

const ENV_KEYS = [
  "XDG_CONFIG_HOME",
  "TEXTMINE_BASE_URL",
  "TEXTMINE_API_KEY",
  "TEXTMINE_PROFILE",
];

let tmp: string;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  tmp = mkdtempSync(join(tmpdir(), "tm-cli-"));
  process.env.XDG_CONFIG_HOME = tmp;
  delete process.env.TEXTMINE_BASE_URL;
  delete process.env.TEXTMINE_API_KEY;
  delete process.env.TEXTMINE_PROFILE;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  rmSync(tmp, { recursive: true, force: true });
});

describe("resolveContext base URL precedence", () => {
  it("falls back to the built-in default", () => {
    expect(resolveContext({}).baseUrl).toBe(
      "https://public-api.textmine.com/v3",
    );
  });

  it("uses the profile config over the default", () => {
    saveConfig({
      activeProfile: "default",
      profiles: { default: { baseUrl: "https://staging.test/v3" } },
    });
    expect(resolveContext({}).baseUrl).toBe("https://staging.test/v3");
  });

  it("env var overrides profile config", () => {
    saveConfig({
      activeProfile: "default",
      profiles: { default: { baseUrl: "https://staging.test/v3" } },
    });
    process.env.TEXTMINE_BASE_URL = "https://env.test";
    expect(resolveContext({}).baseUrl).toBe("https://env.test/v3");
  });

  it("flag overrides env var", () => {
    process.env.TEXTMINE_BASE_URL = "https://env.test";
    expect(resolveContext({ baseUrl: "https://flag.test" }).baseUrl).toBe(
      "https://flag.test/v3",
    );
  });
});

describe("resolveContext API key precedence", () => {
  it("flag > env > stored key", () => {
    setApiKey("default", "tm_stored");
    expect(resolveContext({}).apiKey).toBe("tm_stored");

    process.env.TEXTMINE_API_KEY = "tm_env";
    expect(resolveContext({}).apiKey).toBe("tm_env");

    expect(resolveContext({ apiKey: "tm_flag" }).apiKey).toBe("tm_flag");
  });
});

describe("resolveContext profile precedence", () => {
  it("flag > env > active profile", () => {
    saveConfig({
      activeProfile: "default",
      profiles: { default: {}, staging: { baseUrl: "https://staging.test/v3" } },
    });
    expect(resolveContext({}).profileName).toBe("default");

    process.env.TEXTMINE_PROFILE = "staging";
    expect(resolveContext({}).profileName).toBe("staging");

    expect(resolveContext({ profile: "default" }).profileName).toBe("default");
  });
});

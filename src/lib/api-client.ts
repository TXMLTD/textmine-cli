import { API_KEY_PREFIX } from "./constants.js";
import { AuthError, CliError, ExitCode } from "./errors.js";
import { joinUrl } from "./url.js";

export interface ApiClientOptions {
  baseUrl: string;
  apiKey: string;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Query parameters; undefined/null values are skipped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON request body. */
  body?: unknown;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
  }

  /** Perform a request and parse the JSON response. Returns undefined for 204. */
  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
    let payload: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: payload,
      });
    } catch (err) {
      throw new CliError(
        `Could not reach the API at ${this.baseUrl}.`,
        {
          exitCode: ExitCode.NETWORK,
          hint: `Check your connection and base URL. (${asMessage(err)})`,
        },
      );
    }

    return this.handleResponse<T>(response);
  }

  private buildUrl(
    path: string,
    query?: RequestOptions["query"],
  ): string {
    const url = new URL(joinUrl(this.baseUrl, path));
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const data = parseJson(text);

    if (response.ok) {
      return data as T;
    }

    const apiMessage = extractMessage(data) ?? response.statusText;

    if (response.status === 401 || response.status === 403) {
      throw new AuthError(
        `Authentication failed (${response.status}): ${apiMessage}`,
        keyShapeHint(this.apiKey),
      );
    }

    throw new CliError(`API error ${response.status}: ${apiMessage}`, {
      exitCode: ExitCode.API,
    });
  }
}

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(data: unknown): string | undefined {
  if (typeof data === "string") return data || undefined;
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    for (const field of ["message", "error", "detail", "title"]) {
      if (typeof obj[field] === "string") return obj[field] as string;
    }
  }
  return undefined;
}

function keyShapeHint(apiKey: string): string {
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return `Your API key does not start with "${API_KEY_PREFIX}". Check that you are using a TextMine API key for the right environment.`;
  }
  return "The API key may be invalid, expired, or for a different environment. Run `textmine auth status` to inspect the active profile.";
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

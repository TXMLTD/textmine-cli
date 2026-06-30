import { ApiClient } from "./api-client.js";
import { requireAuth, type GlobalFlags } from "./context.js";

/** Build an authenticated ApiClient from the resolved global flags. */
export function createClient(flags: GlobalFlags): ApiClient {
  const ctx = requireAuth(flags);
  return new ApiClient({ baseUrl: ctx.baseUrl, apiKey: ctx.apiKey });
}

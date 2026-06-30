# TextMine CLI

A standalone, scriptable REST client for the **TextMine Public API V3**.

The CLI talks **directly** to the Public API over HTTPS — it does not go through
MCP. MCP remains the tool protocol for agents; this CLI is the developer- and
script-friendly path.

> Status: **v1, initial scope.** This first cut covers authentication, profiles,
> configuration, diagnostics, and vaults. Documents, document-types, and tasks,
> plus standalone-binary packaging and a Homebrew tap, are tracked as follow-ups
> (see [Roadmap](#roadmap)).

## Install (development)

```bash
npm install
npm run build
node dist/index.js --help
# or link it onto your PATH as `textmine`:
npm link
textmine --help
```

The eventual installation experience will be:

```bash
brew install textmine/tap/textmine-cli
```

## Quickstart

```bash
textmine auth login --api-key tm_...
textmine vaults list
```

The CLI ships with a default Public API base URL
(`https://public-api.textmine.com`) and internally targets `/v3`, so no URL
configuration is needed for normal use.

## Configuration model

A **profile** bundles a base URL + an API key + optional defaults. This avoids
accidentally using a production key against staging (or vice versa).

```bash
textmine profile add staging --base-url https://public-staging.textmine.com
textmine auth login --profile staging --api-key tm_staging_...

textmine profile use staging
textmine vaults list
```

### Base URL resolution order

1. `--base-url` flag
2. `TEXTMINE_BASE_URL` environment variable
3. Active profile / local config
4. Built-in default `https://public-api.textmine.com`

All of these inputs normalize to `https://public-api.textmine.com/v3`:

```
https://public-api.textmine.com
https://public-api.textmine.com/
https://public-api.textmine.com/v3
https://public-api.textmine.com/v3/
```

Known environments:

| Environment | Base URL                              |
| ----------- | ------------------------------------- |
| Production  | `https://public-api.textmine.com`     |
| Staging     | `https://public-staging.textmine.com` |

### API key resolution order

1. `--api-key` flag
2. `TEXTMINE_API_KEY` environment variable
3. API key stored for the active profile
4. Clear error: *"No API key configured for profile &lt;name&gt;."*

### Where things are stored

- Config: `~/.config/textmine/config.json` (honors `XDG_CONFIG_HOME`)
- Credentials: `~/.config/textmine/credentials.json`

Both files are written with strict `0600` permissions and the credentials file
is kept separate from shareable config. (OS-keychain storage is a planned
follow-up; the credential layer is abstracted so it can be swapped in without
changing commands.)

## Commands (v1)

```
textmine auth login --api-key tm_...     # store + verify a key for a profile
textmine auth status                     # show active profile + auth state
textmine auth logout                     # remove the stored key

textmine profile list
textmine profile use <name>
textmine profile add <name> --base-url <url>
textmine profile remove <name>

textmine config get base-url
textmine config set base-url <url>
textmine config reset base-url

textmine api ping                        # GET /v3/_ping
textmine doctor                          # config + connectivity diagnostics

textmine vaults list                     # GET /v3/vaults
textmine vaults get <vault-id>           # GET /v3/vaults/{id}
textmine vaults create "<name>"          # POST /v3/vaults
```

## Output modes

Every command supports a human-readable default and machine-readable JSON:

```bash
textmine vaults list          # aligned table
textmine vaults list --json   # JSON to stdout (clean for piping)
```

In `--json` mode, stdout carries only the JSON payload; diagnostics and warnings
go to stderr. Errors are written for humans (with a `Hint:` line) but also have
a JSON form under `--json`.

### Exit codes

| Code | Meaning                                  |
| ---- | ---------------------------------------- |
| 0    | Success                                  |
| 1    | Generic / unexpected error               |
| 2    | Usage error (bad flags/args/config)      |
| 3    | Authentication error                     |
| 4    | API responded with an error status       |
| 5    | Network / transport failure              |

## Development

```bash
npm run dev         # tsup watch build
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # bundle to dist/index.js
```

## Roadmap

These are intentionally out of the initial scope:

- `documents` — list/upload/get/text/metadata/tags/download-url/rename/reprocess
- `document-types` — list/get/create
- `tasks` — list/create/get/events/message/start/cancel
- Standalone versioned binaries (`textmine-darwin-arm64`, …) via `pkg`/Bun
- Homebrew tap (`github.com/textmine/homebrew-tap`) + release automation
- OS keychain credential backend
- Aligning the API client with the Public API V3 OpenAPI spec to prevent drift

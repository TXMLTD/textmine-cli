# TextMine CLI

A standalone, scriptable REST client for the **TextMine Public API V3**.

The CLI talks **directly** to the Public API over HTTPS — it does not go through
MCP. MCP remains the tool protocol for agents; this CLI is the developer- and
script-friendly path.

> Status: **v1.** Covers authentication, profiles, configuration, diagnostics,
> vaults, documents, document-types, and tasks, and ships as a Homebrew formula
> and prebuilt binaries.

## Get started in 60 seconds

Three steps: **install → authenticate → run.**

```bash
# 1. Install (Homebrew — macOS & Linux)
brew install TXMLTD/tap/textmine-cli

# 2. Authenticate with your API key (create one in the TextMine app; it looks like tm_...)
textmine auth login --api-key tm_...

# 3. Run
textmine vaults list
```

That's it. `auth login` verifies the key against the API before saving it, so if
this step succeeds you're fully configured. Check your setup any time with
`textmine auth status` or `textmine doctor`.

## Install

### Homebrew (recommended)

Works on macOS (Apple Silicon & Intel) and Linux (x64):

```bash
brew install TXMLTD/tap/textmine-cli
```

To upgrade later:

```bash
brew upgrade textmine-cli
```

### Prebuilt binary (manual)

If you'd rather not use Homebrew, download the binary for your platform, drop it
on your `PATH`, and you're done — no Node.js and no build step required.

| Platform              | Asset                                    |
| --------------------- | ---------------------------------------- |
| macOS (Apple Silicon) | `textmine-cli-0.1.0-darwin-arm64.tar.gz` |
| macOS (Intel)         | `textmine-cli-0.1.0-darwin-x64.tar.gz`   |
| Linux (x64)           | `textmine-cli-0.1.0-linux-x64.tar.gz`    |

```bash
# Pick the value for your platform from the table above:
PLATFORM=darwin-arm64   # or darwin-x64, or linux-x64

curl -fsSL "https://github.com/TXMLTD/textmine-cli/releases/download/v0.1.0/textmine-cli-0.1.0-${PLATFORM}.tar.gz" \
  | tar -xz
sudo mv textmine /usr/local/bin/
textmine --help
```

> On macOS the first run may be blocked by Gatekeeper. If so, clear the
> quarantine flag with `xattr -d com.apple.quarantine /usr/local/bin/textmine`.

## Install (development)

```bash
npm install
npm run build
node dist/index.js --help
# or link it onto your PATH as `textmine`:
npm link
textmine --help
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

# Documents (also available as `textmine docs`)
textmine documents list --vault <id>     # GET /v3/documents?vault_id=<id>
textmine documents upload ./file.pdf --vault <id> --document-type <id>
                                         # POST /v3/documents (multipart)
textmine documents get <doc-id>          # GET /v3/documents/{id}
textmine documents text <doc-id>         # GET /v3/documents/{id}/text
textmine documents metadata <doc-id>     # GET /v3/documents/{id}/metadata
textmine documents tags <doc-id>         # GET /v3/documents/{id}/tags
textmine documents download-url <doc-id> # GET /v3/documents/{id}/download-url
textmine documents rename <doc-id> "New name.pdf"   # PATCH /v3/documents/{id}
textmine documents reprocess <doc-id>    # POST /v3/documents/{id}/reprocess

textmine document-types list             # GET /v3/document-types
textmine document-types get <type-id>    # GET /v3/document-types/{id}
textmine document-types create "MSA" --vault <id>   # POST /v3/document-types (vault required)

textmine tasks list                      # GET /v3/tasks
textmine tasks create "Review contract"  # POST /v3/tasks
textmine tasks get <task-id>             # GET /v3/tasks/{id}
textmine tasks events <task-id>          # GET /v3/tasks/{id}/events
textmine tasks message <task-id> "..."   # POST /v3/tasks/{id}/messages
textmine tasks start <task-id>           # POST /v3/tasks/{id}/start
textmine tasks cancel <task-id>          # POST /v3/tasks/{id}/cancel
```

> **Document types are scoped to a vault.** `document-types create` requires a
> `--vault <id>` — without it the API rejects the request with
> `400: vault_id or vault_ids is required; create or select a vault before
> configuring document types`. Use `textmine vaults list` to find a vault id (or
> `textmine vaults create "<name>"` to make one) before creating a document type:
>
> ```bash
> textmine document-types create "MSA" --vault <id>
> ```

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

- Release automation (auto-publish binaries + bump the Homebrew formula on tag)
- OS keychain credential backend
- Aligning the API client with the Public API V3 OpenAPI spec to prevent drift

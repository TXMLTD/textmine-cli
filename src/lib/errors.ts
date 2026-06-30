/** Process exit codes used across the CLI. */
export const ExitCode = {
  OK: 0,
  /** Generic / unexpected error. */
  GENERAL: 1,
  /** Bad usage: invalid flags, missing arguments, bad config input. */
  USAGE: 2,
  /** Authentication problem: missing/invalid/expired key, wrong environment. */
  AUTH: 3,
  /** The API responded with an error status. */
  API: 4,
  /** Network/transport failure (could not reach the API at all). */
  NETWORK: 5,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/**
 * An error meant to be shown to the user. Carries an exit code and an optional
 * `hint` line with a concrete next step. Anything thrown that is NOT a CliError
 * is treated as an unexpected bug and printed with its stack in verbose mode.
 */
export class CliError extends Error {
  readonly exitCode: ExitCodeValue;
  readonly hint?: string;

  constructor(
    message: string,
    options: { exitCode?: ExitCodeValue; hint?: string } = {},
  ) {
    super(message);
    this.name = "CliError";
    this.exitCode = options.exitCode ?? ExitCode.GENERAL;
    this.hint = options.hint;
  }
}

export class AuthError extends CliError {
  constructor(message: string, hint?: string) {
    super(message, { exitCode: ExitCode.AUTH, hint });
    this.name = "AuthError";
  }
}

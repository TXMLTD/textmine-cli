/**
 * Output helpers. Every command supports a human-readable default and a
 * machine-readable `--json` mode. Human output goes to stdout; diagnostics and
 * errors go to stderr so `--json` stdout stays clean for piping.
 */

let jsonMode = false;

/** Set once during program startup based on the global `--json` flag. */
export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

export function isJsonMode(): boolean {
  return jsonMode;
}

/** Print a successful result. In JSON mode emits the raw data; otherwise renders. */
export function printResult(data: unknown, render: () => void): void {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  } else {
    render();
  }
}

/** Print a plain line to stdout (human mode). Suppressed in JSON mode. */
export function printLine(line = ""): void {
  if (!jsonMode) {
    process.stdout.write(`${line}\n`);
  }
}

/** Diagnostic note to stderr (always shown, never pollutes stdout JSON). */
export function printNote(line: string): void {
  process.stderr.write(`${line}\n`);
}

/** Render an array of records as a simple aligned table to stdout. */
export function printTable(
  rows: Array<Record<string, unknown>>,
  columns: string[],
): void {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    return;
  }
  if (rows.length === 0) {
    printLine("(no results)");
    return;
  }

  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((r) => cell(r[col]).length)),
  );

  const header = columns
    .map((col, i) => col.toUpperCase().padEnd(widths[i]!))
    .join("  ");
  printLine(header);

  for (const row of rows) {
    const line = columns
      .map((col, i) => cell(row[col]).padEnd(widths[i]!))
      .join("  ");
    printLine(line);
  }
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

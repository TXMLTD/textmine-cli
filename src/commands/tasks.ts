import type { Command } from "commander";
import { createClient } from "../lib/client-factory.js";
import { pickGlobals } from "../lib/context.js";
import { printLine, printResult, printTable } from "../lib/output.js";

interface TaskLike {
  id?: number | string;
  title?: string;
  instruction?: string;
  status?: string;
  priority?: string;
  source?: string;
  created?: string;
  updated?: string;
  current_summary?: string;
}

interface TaskEvent {
  id?: number | string;
  type?: string;
  message?: string;
  status?: string;
  created?: string;
}

const encode = encodeURIComponent;

/** create/get wrap the task under `task`; list/start/cancel return it flat. */
function unwrapTask(data: unknown): TaskLike {
  if (data && typeof data === "object" && "task" in data) {
    return (data as { task: TaskLike }).task ?? {};
  }
  return (data as TaskLike) ?? {};
}

export function registerTasks(program: Command): void {
  const tasks = program.command("tasks").description("Manage agent tasks");

  tasks
    .command("list")
    .description("List tasks (GET /v3/tasks)")
    .action(async (_opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<TaskLike[]>("/tasks");
      const items = Array.isArray(data) ? data : [];
      printResult(data, () => {
        const rows = items.map((t) => ({
          id: t.id ?? "",
          status: t.status ?? "",
          title: t.title ?? t.instruction ?? "",
        }));
        printTable(rows, ["id", "status", "title"]);
      });
    });

  tasks
    .command("create <instruction>")
    .description("Create a task (POST /v3/tasks)")
    .action(async (instruction: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<unknown>("/tasks", {
        method: "POST",
        body: { instruction },
      });
      printResult(data, () => {
        const task = unwrapTask(data);
        printLine(`Created task ${task.id ?? "?"} (status: ${task.status ?? "?"}).`);
      });
    });

  tasks
    .command("get <taskId>")
    .description("Fetch a task by id (GET /v3/tasks/{taskId})")
    .action(async (taskId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<unknown>(`/tasks/${encode(taskId)}`);
      printResult(data, () => printTask(unwrapTask(data)));
    });

  tasks
    .command("events <taskId>")
    .description("List task events (GET /v3/tasks/{taskId}/events)")
    .action(async (taskId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<TaskEvent[]>(`/tasks/${encode(taskId)}/events`);
      const events = Array.isArray(data) ? data : [];
      printResult(data, () => {
        const rows = events.map((e) => ({
          created: e.created ?? "",
          type: e.type ?? "",
          status: e.status ?? "",
          message: e.message ?? "",
        }));
        printTable(rows, ["created", "type", "status", "message"]);
      });
    });

  tasks
    .command("message <taskId> <message>")
    .description("Send a message to a task (POST /v3/tasks/{taskId}/messages)")
    .action(async (taskId: string, message: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<unknown>(`/tasks/${encode(taskId)}/messages`, {
        method: "POST",
        body: { message },
      });
      printResult(data, () => printLine(`Message sent to task ${taskId}.`));
    });

  tasks
    .command("start <taskId>")
    .description("Start a task (POST /v3/tasks/{taskId}/start)")
    .action(async (taskId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<unknown>(`/tasks/${encode(taskId)}/start`, {
        method: "POST",
      });
      printResult(data, () => {
        const task = unwrapTask(data);
        printLine(`Started task ${task.id ?? taskId} (status: ${task.status ?? "?"}).`);
      });
    });

  tasks
    .command("cancel <taskId>")
    .description("Cancel a task (POST /v3/tasks/{taskId}/cancel)")
    .action(async (taskId: string, _opts, cmd: Command) => {
      const flags = pickGlobals(cmd.optsWithGlobals());
      const client = createClient(flags);
      const data = await client.request<unknown>(`/tasks/${encode(taskId)}/cancel`, {
        method: "POST",
      });
      printResult(data, () => {
        const task = unwrapTask(data);
        printLine(`Cancelled task ${task.id ?? taskId} (status: ${task.status ?? "?"}).`);
      });
    });
}

function printTask(t: TaskLike): void {
  printLine(`id:          ${t.id ?? ""}`);
  if (t.title) printLine(`title:       ${t.title}`);
  printLine(`status:      ${t.status ?? ""}`);
  if (t.priority) printLine(`priority:    ${t.priority}`);
  if (t.instruction) printLine(`instruction: ${t.instruction}`);
  if (t.current_summary) printLine(`summary:     ${t.current_summary}`);
  if (t.created) printLine(`created:     ${t.created}`);
  if (t.updated) printLine(`updated:     ${t.updated}`);
}

/**
 * Operator process log.
 *
 * The audit log (FR-55) stores a redacted reconstruction of each finished
 * answer. This module is the live counterpart: every gate, the payload sent to
 * the model, and the model's reply, printed to the server console and appended
 * to var/trace.jsonl so an operator can watch a request happen.
 *
 * Off by default. Set ASK_TRACE=true. PII is redacted before print or write
 * (FR-56). Credential-shaped keys are stripped even if a caller tries to log
 * them (FR-74, R-15). A write failure never fails the citizen's request.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { redact } from "./audit";

const TRACE_LOG = join(process.cwd(), "var", "trace.jsonl");
const SENSITIVE_KEY = /api[_-]?key|authorization|bearer|credential|secret|password/i;

function enabled(): boolean {
  return process.env.ASK_TRACE === "true";
}

/** Walk a value, redact PII in strings, and drop credential-shaped keys. */
export function scrub(value: unknown): unknown {
  if (typeof value === "string") return redact(value);
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrub);

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = scrub(child);
  }
  return out;
}

export interface TraceEvent {
  at: string;
  id: string;
  elapsedMs: number;
  step: string;
  data?: unknown;
}

export class AskTrace {
  readonly id: string;
  readonly started: number;
  readonly events: TraceEvent[] = [];

  constructor(id: string) {
    this.id = id;
    this.started = Date.now();
  }

  step(name: string, data?: unknown): void {
    if (!enabled()) return;
    const event: TraceEvent = {
      at: new Date().toISOString(),
      id: this.id,
      elapsedMs: Date.now() - this.started,
      step: name,
      data: data === undefined ? undefined : scrub(data),
    };
    this.events.push(event);
    printEvent(event);
  }

  async flush(): Promise<void> {
    if (!enabled() || this.events.length === 0) return;
    try {
      await mkdir(join(process.cwd(), "var"), { recursive: true });
      const lines = this.events.map((e) => JSON.stringify(e)).join("\n") + "\n";
      await appendFile(TRACE_LOG, lines, "utf8");
    } catch (err) {
      console.error("[trace] write failed", err);
    }
  }
}

function printEvent(event: TraceEvent): void {
  const prefix = `[ask ${event.id.slice(0, 8)}]`;
  const header = `${prefix} +${event.elapsedMs}ms  ${event.step}`;
  if (event.data === undefined) {
    console.log(header);
    return;
  }
  if (typeof event.data === "string") {
    console.log(header);
    console.log(event.data);
    return;
  }
  console.log(header);
  console.log(formatData(event.data));
}

function formatData(data: unknown): string {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (typeof value === "string" && (value.includes("\n") || value.length > 120)) {
        lines.push(`  ${key}:`);
        for (const line of value.split("\n")) lines.push(`    ${line}`);
      } else {
        lines.push(`  ${key}: ${stringifyInline(value)}`);
      }
    }
    return lines.join("\n");
  }
  return `  ${stringifyInline(data)}`;
}

function stringifyInline(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const als = new AsyncLocalStorage<AskTrace>();

export function createTrace(id: string): AskTrace {
  return new AskTrace(id);
}

export function runWithTrace<T>(trace: AskTrace, fn: () => T): T {
  return als.run(trace, fn);
}

export function trace(step: string, data?: unknown): void {
  als.getStore()?.step(step, data);
}

export function flushTrace(): Promise<void> {
  return als.getStore()?.flush() ?? Promise.resolve();
}

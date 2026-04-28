import * as fs from "fs";
import * as path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "migrate-storage-debug.log");

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: string, message: string, data?: unknown): string {
  const timestamp = getTimestamp();
  const dataStr = data ? ` | ${JSON.stringify(data, null, 2)}` : "";
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
}

function appendToFile(content: string): void {
  ensureLogDir();
  fs.appendFileSync(LOG_FILE, content, "utf8");
}

export function log(message: string, data?: unknown): void {
  const log = formatMessage("LOG", message, data);
  appendToFile(log);
  console.log(log.trim());
}

export function info(message: string, data?: unknown): void {
  const log = formatMessage("INFO", message, data);
  appendToFile(log);
  console.info(log.trim());
}

export function warn(message: string, data?: unknown): void {
  const log = formatMessage("WARN", message, data);
  appendToFile(log);
  console.warn(log.trim());
}

export function logError(message: string, data?: unknown): void {
  const log = formatMessage("ERROR", message, data);
  appendToFile(log);
  console.error(log.trim());
}

export function debug(message: string, data?: unknown): void {
  const log = formatMessage("DEBUG", message, data);
  appendToFile(log);
  console.log(log.trim());
}

export function clearLog(): void {
  ensureLogDir();
  fs.writeFileSync(LOG_FILE, `=== Log started at ${getTimestamp()} ===\n`, "utf8");
}

export { LOG_FILE };

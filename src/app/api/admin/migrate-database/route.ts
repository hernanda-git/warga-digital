import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { MIGRATION_PHASES } from "@/config/migrations";
import { resolve6, resolve4 } from "dns/promises";

// ─── Credential helpers ─────────────────────────────────────────────────────

function getCreds(body: any) {
  const targetUrl =
    body?.targetUrl ||
    process.env.TARGET_PUBLIC_SUPABASE_URL ||
    process.env.TARGET_SUPABASE_URL ||
    "";
  const targetKey =
    body?.targetKey || process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY || "";
  const targetConnectionString =
    body?.targetConnectionString || process.env.TARGET_CONNECTION_STRING || "";
  const targetPassword =
    body?.targetPassword || process.env.TARGET_SUPABASE_DB_PASSWORD || "";
  return { targetUrl, targetKey, targetConnectionString, targetPassword };
}

function getProjectRef(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    if (parts.length >= 2 && parts[0] !== "localhost") return parts[0];
  } catch {}
  throw new Error("Invalid Supabase URL");
}

// ─── DNS resolution ─────────────────────────────────────────────────────────

async function resolveDbHost(hostname: string): Promise<string> {
  try {
    const addrs = await resolve6(hostname);
    if (addrs.length > 0) return addrs[0];
  } catch {}
  try {
    const addrs = await resolve4(hostname);
    if (addrs.length > 0) return addrs[0];
  } catch {}
  return hostname;
}

// ─── Connection string parser ────────────────────────────────────────────────

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function parseConnectionString(cs: string): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} | null {
  try {
    let s = cs;
    const protoMatch = s.match(/^postgres(?:ql)?:\/\//);
    if (!protoMatch) return null;
    s = s.slice(protoMatch[0].length);

    const authMatch = s.match(/^([^:@]+)(?::([^@]*))?@/);
    if (!authMatch) return null;
    const user = safeDecode(authMatch[1]);
    const rawPassword = authMatch[2] ? safeDecode(authMatch[2]) : "";
    s = s.slice(authMatch[0].length);

    const hostMatch = s.match(/^([^:/]+)(?::(\d+))?(?:\/(.*))?$/);
    if (!hostMatch) return null;
    return {
      host: hostMatch[1],
      port: hostMatch[2] ? parseInt(hostMatch[2], 10) : 5432,
      database: hostMatch[3] || "postgres",
      user,
      password: rawPassword,
    };
  } catch {
    return null;
  }
}

async function createPool(url: string, connectionString: string, password: string): Promise<Pool> {
  let host = "";
  let port = 5432;
  let database = "postgres";
  let user = "postgres";
  let pw = password;

  if (connectionString) {
    const parsed = parseConnectionString(connectionString);
    if (parsed) {
      host = parsed.host;
      port = parsed.port;
      database = parsed.database;
      user = parsed.user;
      pw = parsed.password;
    } else {
      throw new Error("Failed to parse database connection string");
    }
  } else if (password) {
    const ref = getProjectRef(url);
    host = `db.${ref}.supabase.co`;
  } else {
    throw new Error("No database connection string or password provided");
  }

  const resolvedHost = await resolveDbHost(host);

  return new Pool({
    host: resolvedHost,
    port,
    database,
    user,
    password: pw,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  });
}

function createSupabaseClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Error helpers ──────────────────────────────────────────────────────────

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async function handleCheckConnection(body: any) {
  const { targetUrl, targetKey, targetConnectionString, targetPassword } = getCreds(body);
  if (!targetUrl || !targetKey || (!targetConnectionString && !targetPassword)) {
    return NextResponse.json({
      ok: false,
      error:
        "Credentials not provided. Set TARGET_PUBLIC_SUPABASE_URL, TARGET_SUPABASE_SERVICE_ROLE_KEY, and TARGET_CONNECTION_STRING in .env or pass in request body.",
    });
  }

  let pool;
  try {
    pool = await createPool(targetUrl, targetConnectionString, targetPassword);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to create database pool" },
      { status: 200 },
    );
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err: any) {
    const msg = err?.message ?? "";
    const code = err?.code ?? "";
    let hint = "";
    if (code === "ENETUNREACH") {
      hint =
        "Target database is IPv6-only and your machine cannot reach it. " +
        "Enable IPv6 on your network, use a machine/cloud function with IPv6 (e.g. deploy to Vercel), " +
        "or contact Supabase support to request IPv4 for your project.";
    } else if (code === "EAI_AGAIN") {
      hint =
        "DNS lookup failed temporarily. Check your network/DNS configuration.";
    }
    await pool.end().catch(() => {});
    return NextResponse.json(
      { ok: false, error: msg, hint },
      { status: 200 },
    );
  }
  try {
    const start = Date.now();
    const result = await client.query("SELECT version() as v");
    const latency = Date.now() - start;
    const ref = getProjectRef(targetUrl);
    return NextResponse.json({
      ok: true,
      version: result.rows[0]?.v ?? "unknown",
      projectRef: ref,
      latencyMs: latency,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Connection failed" },
      { status: 200 },
    );
  } finally {
    client.release();
    await pool.end();
  }
}

async function handleValidate(body: any) {
  const { targetUrl, targetKey, targetConnectionString, targetPassword } = getCreds(body);
  if (!targetUrl || !targetKey || (!targetConnectionString && !targetPassword)) {
    return NextResponse.json({ error: "Credentials not provided" }, { status: 400 });
  }

  const pool = await createPool(targetUrl, targetConnectionString, targetPassword);
  const client = await pool.connect();
  try {
    const tablesResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    const tables = tablesResult.rows.map((r: any) => r.table_name);

    const extResult = await client.query(
      "SELECT extname FROM pg_extension ORDER BY extname",
    );
    const extensions = extResult.rows.map((r: any) => r.extname);

    const schemaResult = await client.query(
      "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name",
    );
    const schemas = schemaResult.rows.map((r: any) => r.schema_name);

    return NextResponse.json({
      tables,
      extensions,
      schemas,
      tableCount: tables.length,
      isEmpty: tables.length === 0,
      warnings: [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Validation failed" },
      { status: 200 },
    );
  } finally {
    client.release();
    await pool.end();
  }
}

async function handleMigrate(body: any) {
  const { targetUrl, targetKey, targetConnectionString, targetPassword } = getCreds(body);
  if (!targetUrl || !targetKey || (!targetConnectionString && !targetPassword)) {
    const errMsg = "Credentials not provided";
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(encodeSSE({ type: "error", message: errMsg })),
        );
        controller.enqueue(new TextEncoder().encode(encodeSSE({ type: "complete" })));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const pool = await createPool(targetUrl, targetConnectionString, targetPassword);
  const phaseIds: number[] = body.phases ?? MIGRATION_PHASES.map((p) => p.id);
  const phases = MIGRATION_PHASES.filter((p) => phaseIds.includes(p.id));

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(data)));
      };

      for (const phase of phases) {
        send({ type: "phase-start", phase: phase.id, label: phase.label });
        let phaseOk = true;

        for (const step of phase.steps) {
          send({ type: "step-start", phase: phase.id, step: step.id });

          const statements = splitSQL(step.sql);
          let stepOk = true;

          for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            if (!stmt) continue;

            try {
              await pool.query(stmt);
              send({
                type: "step-progress",
                phase: phase.id,
                step: step.id,
                index: i,
                total: statements.length,
              });
            } catch (err: any) {
              stepOk = false;
              phaseOk = false;
              send({
                type: "step-error",
                phase: phase.id,
                step: step.id,
                index: i,
                error: err?.message ?? "Query failed",
                statement: stmt.slice(0, 200),
              });
              break;
            }
          }

          send({
            type: "step-end",
            phase: phase.id,
            step: step.id,
            status: stepOk ? "done" : "error",
          });
        }

        send({
          type: "phase-end",
          phase: phase.id,
          status: phaseOk ? "done" : "error",
        });
      }

      // Verification phase (collect row counts from all tables)
      send({ type: "phase-start", phase: 10, label: "Verifikasi" });
      try {
        const tablesRes = await pool.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
        );
        const counts: Record<string, number> = {};
        for (const row of tablesRes.rows as any[]) {
          try {
            const c = await pool.query(
              `SELECT COUNT(*)::int as cnt FROM "${row.table_name.replace(/"/g, '""')}"`,
            );
            counts[row.table_name] = c.rows[0]?.cnt ?? 0;
          } catch {
            counts[row.table_name] = -1;
          }
        }
        send({
          type: "phase-end",
          phase: 10,
          status: "done",
          tableCounts: counts,
        });
      } catch (err: any) {
        send({
          type: "phase-end",
          phase: 10,
          status: "error",
          error: err?.message,
        });
      }

      send({ type: "complete" });
      controller.close();
      await pool.end();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ─── Split SQL ──────────────────────────────────────────────────────────────

function splitSQL(sql: string): string[] {
  const cleaned = sql.replace(/^\s*--.*$/gm, "").trim();
  if (!cleaned) return [];

  const statements: string[] = [];
  let current = "";
  let inDollar = false;
  let dollarTag = "";
  let inString = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (!inDollar && !inString) {
      if (ch === "'") {
        inString = true;
        current += ch;
        continue;
      }
      const match = cleaned.slice(i).match(/^\$(\w*)\$/);
      if (match) {
        dollarTag = match[1] ?? "";
        inDollar = true;
        current += match[0];
        i += match[0].length - 1;
        continue;
      }
      if (ch === ";") {
        const trimmed = current.trim();
        if (trimmed) statements.push(trimmed);
        current = "";
        continue;
      }
    } else if (inString) {
      if (ch === "'" && cleaned[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      if (ch === "'") {
        inString = false;
      }
    } else if (inDollar) {
      const endTag = `$${dollarTag}$`;
      if (cleaned.slice(i, i + endTag.length) === endTag) {
        inDollar = false;
        dollarTag = "";
        current += endTag;
        i += endTag.length - 1;
        continue;
      }
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);

  return statements;
}

// ─── Route handler ──────────────────────────────────────────────────────────

async function handleGetConfig() {
  const url =
    process.env.TARGET_PUBLIC_SUPABASE_URL ||
    process.env.TARGET_SUPABASE_URL ||
    "";
  const key = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY || "";
  const cs = process.env.TARGET_CONNECTION_STRING || "";
  return NextResponse.json({
    targetUrl: url,
    targetKey: key,
    targetConnectionString: cs,
  });
}

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handleGetConfig();
  } catch (err: any) {
    console.error("[MigrateDatabase] GET error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action as string;

    switch (action) {
      case "check-connection":
        return handleCheckConnection(body);
      case "validate":
        return handleValidate(body);
      case "migrate":
        return handleMigrate(body);
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Supported: check-connection, validate, migrate` },
          { status: 400 },
        );
    }
  } catch (err: any) {
    console.error("[MigrateDatabase] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}

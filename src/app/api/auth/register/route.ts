import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { uuidv7 } from "uuidv7";
import {
  normalizeWaNumber,
  validateNormalizedWaNumber,
} from "@/lib/phone-utils";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  DEFAULT_ROLE_WARGA_ID,
} from "@/lib/constants/seed-ids";
import { parseBlokRumah } from "@/lib/blok-rumah";
import { hashPin } from "@/lib/crypto";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { notifyAdmins } from "@/lib/notifications";

/* ──────────────────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────────────────── */
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const PIN_REGEX = /^\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FamilyMemberInput {
  fullName: string;
  username?: string;
  waNumber?: string;
  email?: string;
}

interface RegisterPayload {
  fullName: string;
  waNumber?: string;
  email?: string;
  username?: string;
  blokRumah: string;
  houseId: string;
  familyMembers: FamilyMemberInput[];
  pin: string;
  confirmPin: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Helper: assign default WARGA role (idempotent)
   ──────────────────────────────────────────────────────────────────────── */
async function assignDefaultWargaRole(
  supabase: ReturnType<typeof createServerClient>,
  tenantUserId: string,
) {
  const { error: roleErr } = await supabase.from("tenant_user_roles").insert({
    tenant_user_id: tenantUserId,
    role_id: DEFAULT_ROLE_WARGA_ID,
  });
  if (roleErr && roleErr.code !== "23505") {
    // Non-unique errors are unexpected; swallow to avoid breaking registration
    console.error("assignDefaultWargaRole error:", roleErr);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Helper: collect all identifiers that must be unique across the system
   ──────────────────────────────────────────────────────────────────────── */
function collectIdentifiers(payload: RegisterPayload): {
  waNumbers: string[];
  emails: string[];
  usernames: string[];
} {
  const waNumbers: string[] = [];
  const emails: string[] = [];
  const usernames: string[] = [];

  if (payload.waNumber) waNumbers.push(payload.waNumber);
  if (payload.email) emails.push(payload.email.toLowerCase().trim());
  if (payload.username) usernames.push(payload.username);

  for (const m of payload.familyMembers) {
    if (m.waNumber) waNumbers.push(m.waNumber);
    if (m.email) emails.push(m.email.toLowerCase().trim());
    if (m.username) usernames.push(m.username);
  }

  return { waNumbers, emails, usernames };
}

/* ──────────────────────────────────────────────────────────────────────────
   Helper: check in-request duplicates (family vs main & family vs family)
   Returns a user-friendly error message or null.
   ──────────────────────────────────────────────────────────────────────── */
function checkInternalDuplicates(payload: RegisterPayload): string | null {
  const seenWa = new Map<string, string>(); // value -> label
  const seenEmail = new Map<string, string>();
  const seenUsername = new Map<string, string>();

  const label = payload.waNumber ? "Nomor WhatsApp utama" : "Email utama";

  if (payload.waNumber) {
    seenWa.set(payload.waNumber, "data utama");
  }
  if (payload.email) {
    seenEmail.set(payload.email.toLowerCase().trim(), "data utama");
  }
  if (payload.username) {
    seenUsername.set(payload.username, "data utama");
  }

  for (let i = 0; i < payload.familyMembers.length; i++) {
    const m = payload.familyMembers[i];
    const tag = `anggota ${i + 1} (${m.fullName})`;

    if (m.waNumber) {
      const existing = seenWa.get(m.waNumber);
      if (existing) {
        return `Nomor WhatsApp ${m.waNumber} sudah dipakai di ${existing}`;
      }
      seenWa.set(m.waNumber, tag);
    }

    if (m.email) {
      const key = m.email.toLowerCase().trim();
      const existing = seenEmail.get(key);
      if (existing) {
        return `Email ${m.email} sudah dipakai di ${existing}`;
      }
      seenEmail.set(key, tag);
    }

    if (m.username) {
      const existing = seenUsername.get(m.username);
      if (existing) {
        return `Username @${m.username} sudah dipakai di ${existing}`;
      }
      seenUsername.set(m.username, tag);
    }
  }

  return null;
}

/* ──────────────────────────────────────────────────────────────────────────
   Helper: check identifiers against existing DB users
   Returns a user-friendly error message or null.
   ──────────────────────────────────────────────────────────────────────── */
async function checkDbDuplicates(
  supabase: ReturnType<typeof createServerClient>,
  identifiers: ReturnType<typeof collectIdentifiers>,
): Promise<string | null> {
  // ── WhatsApp numbers ─────────────────────────────────────────────────────
  if (identifiers.waNumbers.length > 0) {
    const { data: rows } = await supabase
      .from("users")
      .select("wa_number")
      .in("wa_number", identifiers.waNumbers);

    if (rows && rows.length > 0) {
      return `Nomor WhatsApp ${rows[0].wa_number} sudah terdaftar. Gunakan nomor lain atau login.`;
    }
  }

  // ── Emails (case-insensitive) ────────────────────────────────────────────
  const emailChecks: Promise<string | null>[] = [];
  for (const email of identifiers.emails) {
    emailChecks.push(
      (async () => {
        const { data: rows } = await supabase
          .from("users")
          .select("email")
          .eq("email", email);

        if (rows && rows.length > 0) {
          return `Email ${email} sudah terdaftar. Gunakan email lain atau login.`;
        }
        return null;
      })(),
    );
  }

  const emailResults = await Promise.all(emailChecks);
  const emailConflict = emailResults.find(Boolean);
  if (emailConflict) return emailConflict;

  // ── Usernames (case-insensitive via RPC) ─────────────────────────────────
  for (const username of identifiers.usernames) {
    const { data: rows } = await supabase.rpc("get_user_by_username_lower", {
      login_input: username,
    });

    if (Array.isArray(rows) && rows.length > 0) {
      return `Username @${username} sudah dipakai. Pilih username lain.`;
    }
  }

  return null;
}

/* ──────────────────────────────────────────────────────────────────────────
   POST /api/auth/register
   Complete registration: validates everything upfront, then creates all
   records atomically. No partial writes, no auto-creation of houses.
   ──────────────────────────────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const body: RegisterPayload = await request.json();
    const {
      fullName,
      waNumber: waNumberRaw,
      email: emailRaw,
      username: usernameRaw,
      blokRumah: blokRumahRaw,
      houseId,
      familyMembers,
      pin,
      confirmPin,
    } = body;

    /* ════════════════════════════════════════════════════════════════════════
       PHASE 1 — Validate all inputs
       ══════════════════════════════════════════════════════════════════════ */

    // ── Full name ───────────────────────────────────────────────────────────
    if (!fullName || typeof fullName !== "string") {
      return NextResponse.json(
        { error: "Nama lengkap wajib diisi", field: "fullName" },
        { status: 400 },
      );
    }
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: "Nama lengkap minimal 2 karakter", field: "fullName" },
        { status: 400 },
      );
    }

    // ── At least one login method ───────────────────────────────────────────
    const hasWa =
      waNumberRaw != null &&
      typeof waNumberRaw === "string" &&
      waNumberRaw.trim().length > 0;
    const hasUsername =
      usernameRaw != null &&
      typeof usernameRaw === "string" &&
      usernameRaw.trim().length > 0;
    const hasEmail =
      emailRaw != null &&
      typeof emailRaw === "string" &&
      emailRaw.trim().length > 0;

    if (!hasWa && !hasUsername && !hasEmail) {
      return NextResponse.json(
        {
          error:
            "Isi minimal satu: nomor WhatsApp, email, atau username untuk login",
          field: "login",
        },
        { status: 400 },
      );
    }

    // ── WhatsApp ────────────────────────────────────────────────────────────
    let normalizedWa: string | null = null;
    if (hasWa) {
      normalizedWa = normalizeWaNumber(String(waNumberRaw).trim());
      const waError = validateNormalizedWaNumber(normalizedWa);
      if (waError) {
        return NextResponse.json(
          { error: waError, field: "waNumber" },
          { status: 400 },
        );
      }
    }

    // ── Email ───────────────────────────────────────────────────────────────
    let normalizedEmail: string | null = null;
    if (hasEmail) {
      normalizedEmail = String(emailRaw).trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return NextResponse.json(
          { error: "Format email tidak valid", field: "email" },
          { status: 400 },
        );
      }
    }

    // ── Username ────────────────────────────────────────────────────────────
    let normalizedUsername: string | null = null;
    if (hasUsername) {
      normalizedUsername = String(usernameRaw).trim();
      if (!USERNAME_REGEX.test(normalizedUsername)) {
        return NextResponse.json(
          {
            error: "Username 3–30 karakter, huruf/angka/underscore saja",
            field: "username",
          },
          { status: 400 },
        );
      }
    }

    // ── Blok rumah ──────────────────────────────────────────────────────────
    if (
      blokRumahRaw == null ||
      typeof blokRumahRaw !== "string" ||
      !blokRumahRaw.trim()
    ) {
      return NextResponse.json(
        { error: "Blok rumah wajib diisi", field: "blokRumah" },
        { status: 400 },
      );
    }
    const { normalized: normalizedBlok, error: blokError } =
      parseBlokRumah(blokRumahRaw);
    if (blokError) {
      return NextResponse.json(
        { error: blokError, field: "blokRumah" },
        { status: 400 },
      );
    }

    // ── houseId ─────────────────────────────────────────────────────────────
    if (!houseId || typeof houseId !== "string") {
      return NextResponse.json(
        { error: "ID rumah tidak valid", field: "blokRumah" },
        { status: 400 },
      );
    }

    // ── PIN ─────────────────────────────────────────────────────────────────
    const pinStr = String(pin ?? "").trim();
    const confirmStr = String(confirmPin ?? "").trim();
    if (!PIN_REGEX.test(pinStr)) {
      return NextResponse.json(
        { error: "PIN harus 4 digit angka", field: "pin" },
        { status: 400 },
      );
    }
    if (pinStr !== confirmStr) {
      return NextResponse.json(
        { error: "PIN dan konfirmasi PIN tidak sama", field: "confirmPin" },
        { status: 400 },
      );
    }

    // ── Family members ──────────────────────────────────────────────────────
    const members: FamilyMemberInput[] = Array.isArray(familyMembers)
      ? familyMembers
      : [];
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (
        !m.fullName ||
        typeof m.fullName !== "string" ||
        m.fullName.trim().length < 2
      ) {
        return NextResponse.json(
          {
            error: `Anggota ${i + 1}: nama lengkap minimal 2 karakter`,
            field: `familyMembers[${i}].fullName`,
          },
          { status: 400 },
        );
      }
      m.fullName = m.fullName.trim();

      if (m.waNumber) {
        m.waNumber = normalizeWaNumber(m.waNumber);
        const waErr = validateNormalizedWaNumber(m.waNumber);
        if (waErr) {
          return NextResponse.json(
            {
              error: `Anggota ${i + 1} (${m.fullName}): ${waErr}`,
              field: `familyMembers[${i}].waNumber`,
            },
            { status: 400 },
          );
        }
      }

      if (m.email) {
        const e = m.email.trim().toLowerCase();
        if (!EMAIL_REGEX.test(e)) {
          return NextResponse.json(
            {
              error: `Anggota ${i + 1} (${m.fullName}): format email tidak valid`,
              field: `familyMembers[${i}].email`,
            },
            { status: 400 },
          );
        }
        m.email = e;
      }

      if (m.username) {
        if (!USERNAME_REGEX.test(m.username)) {
          return NextResponse.json(
            {
              error: `Anggota ${i + 1} (${m.fullName}): username 3–30 karakter, huruf/angka/underscore`,
              field: `familyMembers[${i}].username`,
            },
            { status: 400 },
          );
        }
        m.username = m.username;
      }

      // Each family member must have at least one identifier
      if (!m.waNumber && !m.email && !m.username) {
        return NextResponse.json(
          {
            error: `Anggota ${i + 1} (${m.fullName}): isi minimal satu: nomor WhatsApp, email, atau username`,
            field: `familyMembers[${i}].login`,
          },
          { status: 400 },
        );
      }
    }

    /* ════════════════════════════════════════════════════════════════════════
       PHASE 2 — Verify house exists (NO auto-create)
       ══════════════════════════════════════════════════════════════════════ */
    const supabase = createServerClient();
    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    const { data: houseRow, error: houseErr } = await supabase
      .from("houses")
      .select("id")
      .eq("id", houseId)
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("blok_rumah", normalizedBlok)
      .maybeSingle();

    if (houseErr || !houseRow) {
      return NextResponse.json(
        {
          error:
            "Blok rumah tidak ditemukan. Silakan hubungi pengurus RT untuk mendaftarkan blok ini.",
          field: "blokRumah",
        },
        { status: 400 },
      );
    }

    /* ════════════════════════════════════════════════════════════════════════
       PHASE 3 — Check duplicates (WA, email, username) against DB and in-request
       ══════════════════════════════════════════════════════════════════════ */

    // Build the full payload with normalized values for duplicate checking
    const fullPayload: RegisterPayload = {
      fullName: trimmedName,
      waNumber: normalizedWa ?? undefined,
      email: normalizedEmail ?? undefined,
      username: normalizedUsername ?? undefined,
      blokRumah: normalizedBlok,
      houseId,
      familyMembers: members,
      pin: pinStr,
      confirmPin: confirmStr,
    };

    // 3a — Internal duplicates (main ↔ family, family ↔ family)
    const internalConflict = checkInternalDuplicates(fullPayload);
    if (internalConflict) {
      return NextResponse.json({ error: internalConflict }, { status: 409 });
    }

    // 3b — Against existing DB records
    const identifiers = collectIdentifiers(fullPayload);
    const dbConflict = await checkDbDuplicates(supabase, identifiers);
    if (dbConflict) {
      return NextResponse.json({ error: dbConflict }, { status: 409 });
    }

    /* ════════════════════════════════════════════════════════════════════════
       PHASE 4 — Check house ownership status
       ══════════════════════════════════════════════════════════════════════ */
    const { data: ownerRow } = await supabase
      .from("user_houses")
      .select("user_id")
      .eq("house_id", houseId)
      .eq("relationship", "OWNER")
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle();

    const hasExistingOwner = !!ownerRow?.user_id;

    /* ════════════════════════════════════════════════════════════════════════
       PHASE 5 — Create all records (best-effort sequential, fail on any error)
       ══════════════════════════════════════════════════════════════════════ */

    let mainUserId: string;
    let caughtError: string | null = null;

    try {
      // 5a — Create main user with PIN, active immediately
      const now = new Date().toISOString();
      const pinHash = hashPin(pinStr);

      const { data: newUser, error: userErr } = await supabase
        .from("users")
        .insert({
          id: uuidv7(),
          full_name: trimmedName,
          wa_number: normalizedWa ?? undefined,
          email: normalizedEmail ?? undefined,
          username: normalizedUsername ?? undefined,
          community_id: communityId,
          pin_hash: pinHash,
          status: "ACTIVE",
          wa_verified_at: now,
        })
        .select("id, full_name")
        .single();

      if (userErr) {
        if (userErr.code === "23505") {
          // This shouldn't happen after duplicate check, but handle gracefully
          return NextResponse.json(
            { error: "Nomor WhatsApp, email, atau username sudah terdaftar" },
            { status: 409 },
          );
        }
        throw new Error("Gagal membuat akun utama");
      }
      mainUserId = newUser.id;

      // 5b — Create tenant_users for main user
      const { data: mainTu, error: tuErr } = await supabase
        .from("tenant_users")
        .insert({
          tenant_id: tenantId,
          user_id: mainUserId,
          status: "ACTIVE",
        })
        .select("id")
        .single();

      if (tuErr || !mainTu) {
        throw new Error("Gagal mendaftarkan ke tenant");
      }

      // 5c — Assign default WARGA role to main user
      await assignDefaultWargaRole(supabase, mainTu.id);

      // 5d — Create user_houses for main user (OWNER or FAMILY)
      const mainRelationship = hasExistingOwner ? "FAMILY" : "OWNER";
      const { error: uhErr } = await supabase.from("user_houses").insert({
        id: uuidv7(),
        tenant_id: tenantId,
        user_id: mainUserId,
        house_id: houseId,
        relationship: mainRelationship,
        is_primary: true,
        status: "ACTIVE",
        created_by: mainUserId,
      });

      if (uhErr) {
        throw new Error("Gagal mengaitkan ke rumah");
      }

      // 5e — If house has an owner, create house_join_requests PENDING
      let requestId: string | null = null;
      if (hasExistingOwner) {
        requestId = uuidv7();
        const { error: reqErr } = await supabase
          .from("house_join_requests")
          .insert({
            id: requestId,
            house_id: houseId,
            requester_user_id: mainUserId,
            status: "PENDING",
          });

        if (reqErr) {
          throw new Error("Gagal mengirim permintaan bergabung");
        }

        // Notify the owner
        await supabase.from("notifications").insert({
          tenant_id: tenantId,
          recipient_user_id: ownerRow.user_id,
          actor_user_id: mainUserId,
          type: "RUMAH",
          priority: "NORMAL",
          title: "Permintaan Bergabung Rumah",
          body: `${trimmedName} meminta bergabung ke rumah ${normalizedBlok}.`,
          action_url: "/profil",
          entity_table: "house_join_requests",
          entity_id: requestId,
          dedupe_key: `house_join_request:${requestId}:owner`,
          metadata: {
            houseId,
            blokRumah: normalizedBlok,
            requesterUserId: mainUserId,
            requestId,
          },
          created_by: mainUserId,
        });
      }

      // 5f — Create family members
      const familyUserIds: string[] = [];
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const famUserId = uuidv7();

        const { error: famErr } = await supabase.from("users").insert({
          id: famUserId,
          full_name: m.fullName,
          wa_number: m.waNumber ?? undefined,
          email: m.email ?? undefined,
          username: m.username ?? undefined,
          community_id: communityId,
          status: "INACTIVE",
        });

        if (famErr) {
          throw new Error(`Gagal menambah anggota: ${m.fullName}`);
        }

        // Family member -> tenant_users
        const { data: famTu, error: famTuErr } = await supabase
          .from("tenant_users")
          .insert({
            tenant_id: tenantId,
            user_id: famUserId,
            status: "ACTIVE",
          })
          .select("id")
          .single();

        if (famTuErr || !famTu) {
          throw new Error(
            `Gagal mendaftarkan anggota ke tenant: ${m.fullName}`,
          );
        }

        await assignDefaultWargaRole(supabase, famTu.id);

        // Family member -> user_houses (FAMILY, non-primary)
        const { error: famUhErr } = await supabase.from("user_houses").insert({
          id: uuidv7(),
          tenant_id: tenantId,
          user_id: famUserId,
          house_id: houseId,
          relationship: "FAMILY",
          is_primary: false,
          status: "ACTIVE",
          created_by: mainUserId,
        });

        if (famUhErr) {
          throw new Error(`Gagal mengaitkan anggota ke rumah: ${m.fullName}`);
        }

        familyUserIds.push(famUserId);
      }

      // 5g — Badges for main user (best-effort)
      await supabase
        .from("user_badges")
        .insert({ user_id: mainUserId, badge_id: 1 });
      await supabase
        .from("user_badges")
        .insert({ user_id: mainUserId, badge_id: 2 });

      // 5h — Notify admins (best-effort)
      await notifyAdmins(supabase, {
        tenant_id: tenantId,
        actor_user_id: mainUserId,
        type: "SYSTEM",
        priority: "NORMAL",
        title: hasExistingOwner
          ? "Warga Baru Terdaftar (Menunggu Persetujuan)"
          : "Warga Baru Terdaftar",
        body: hasExistingOwner
          ? `${trimmedName} baru saja mendaftar dengan blok rumah ${normalizedBlok} dan menunggu persetujuan bergabung.`
          : `${trimmedName} baru saja mendaftar dengan blok rumah ${normalizedBlok}.`,
        action_url: "/admin/warga",
        entity_table: "users",
        entity_id: mainUserId,
        dedupe_key: `new_user:${mainUserId}:registered`,
        metadata: {
          blokRumah: normalizedBlok,
          requiresApproval: hasExistingOwner,
        },
        created_by: mainUserId,
      });

      /* ══════════════════════════════════════════════════════════════════════
         PHASE 6 — Create session and set cookie
         ════════════════════════════════════════════════════════════════════ */
      const jwt = await createSession(mainUserId);
      await setSessionCookie(jwt);

      return NextResponse.json({
        success: true,
        userId: mainUserId,
        fullName: trimmedName,
        houseId,
        blokRumah: normalizedBlok,
        requiresApproval: hasExistingOwner,
        requestId,
      });
    } catch (err) {
      // If we created records but something failed mid-way, log it for debugging.
      // In production, a proper transaction (DB RPC) would roll back.
      // The sequential approach means failures are rare and early (before many writes).
      caughtError =
        err instanceof Error ? err.message : "Gagal menyelesaikan pendaftaran";
      console.error("Registration error (partial write risk):", caughtError);

      return NextResponse.json({ error: caughtError }, { status: 500 });
    }
  } catch (err) {
    console.error("Registration unexpected error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

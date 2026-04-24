import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Image proxy with extended timeout.
 * Use this as a fallback when Next.js built-in image optimization
 * times out on slow upstream sources (R2, Supabase Storage, etc.).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Basic URL validation to prevent open proxy abuse
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const allowedHostnames = [
    "oo.warga-digital.com",
    "bdowfkznkwwveemtpuwg.supabase.co",
    "r2.cloudflarestorage.com",
  ];

  const isAllowed = allowedHostnames.some(
    (h) => parsedUrl.hostname === h || parsedUrl.hostname.endsWith(`.${h}`)
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "Hostname not allowed" }, { status: 403 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Forward minimal headers; avoid leaking internal info
        accept: request.headers.get("accept") ?? "image/*",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const cacheControl = response.headers.get("cache-control") ?? "public, max-age=86400";

    const blob = await response.blob();

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": cacheControl,
      },
    });
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Upstream timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}

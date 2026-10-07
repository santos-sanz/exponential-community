import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { normalizeXUsername } from "@/lib/x";
import { parseXPreview } from "@/lib/x-preview";
function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function GET(request: NextRequest) {
  const token = await convexAuthNextjsToken();
  if (!token) return reply({ available: false }, 401);
  try {
    await fetchQuery(api.profiles.viewer, { kind: "x" }, { token });
  } catch {
    return reply({ available: false }, 403);
  }
  let username: string;
  try {
    username = normalizeXUsername(
      request.nextUrl.searchParams.get("username") ?? "",
    );
  } catch {
    return reply({ available: false }, 400);
  }
  try {
    const response = await fetch(`https://x.com/${username}`, {
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
      headers: { Accept: "text/html" },
    });
    if (
      !response.ok ||
      !(response.headers.get("content-type") ?? "").includes("text/html")
    )
      return reply({ available: false });
    const reader = response.body?.getReader();
    if (!reader) return reply({ available: false });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) {
        await reader.cancel();
        return reply({ available: false });
      }
      chunks.push(value);
    }
    const preview = parseXPreview(
      Buffer.concat(chunks).toString("utf8"),
      username,
    );
    return reply(
      preview ? { available: true, profile: preview } : { available: false },
    );
  } catch {
    return reply({ available: false });
  }
}

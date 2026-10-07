import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  token: vi.fn(),
  member: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsToken: mocks.token,
}));
vi.mock("convex/nextjs", () => ({ fetchQuery: mocks.member }));
import { GET } from "../app/api/x-profile/route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.token.mockResolvedValue("test-token");
  mocks.member.mockResolvedValue({ value: "example", published: true });
  vi.stubGlobal("fetch", mocks.fetch);
});
test("auth and active membership are required before contacting X", async () => {
  mocks.token.mockResolvedValue(undefined);
  expect(
    (
      await GET(
        new NextRequest("https://example.test/api/x-profile?username=example"),
      )
    ).status,
  ).toBe(401);
  expect(mocks.fetch).not.toHaveBeenCalled();
  mocks.token.mockResolvedValue("test-token");
  mocks.member.mockRejectedValue(new Error("Inactive"));
  expect(
    (
      await GET(
        new NextRequest("https://example.test/api/x-profile?username=example"),
      )
    ).status,
  ).toBe(403);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
test("validates account names and never follows arbitrary redirects", async () => {
  expect(
    (
      await GET(
        new NextRequest(
          "https://example.test/api/x-profile?username=https://evil.test/user",
        ),
      )
    ).status,
  ).toBe(400);
  expect(mocks.fetch).not.toHaveBeenCalled();
  mocks.fetch.mockResolvedValue(
    new Response('<meta property="og:type" content="website">', {
      headers: { "content-type": "text/html" },
    }),
  );
  const result = await GET(
    new NextRequest("https://example.test/api/x-profile?username=example"),
  );
  expect(await result.json()).toEqual({ available: false });
  expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.fetch.mock.calls[0][0]).toBe("https://x.com/example");
  expect(mocks.fetch.mock.calls[0][1].redirect).toBe("error");
});

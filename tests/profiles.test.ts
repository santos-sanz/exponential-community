import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { describe, expect, test } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { normalizeProfile, type DirectoryKind } from "../lib/profiles";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}
async function member(t: ReturnType<typeof setup>, phone = "+12025550123") {
  await t.mutation(internal.members.importPhones, { phones: [phone] });
  const userId = await t.mutation(internal.members.admit, { phone });
  return t.withIdentity({ subject: `${userId}|test-session` });
}
const inputs: { kind: DirectoryKind; value: string }[] = [
  { kind: "github", value: "https://github.com/Example" },
  { kind: "linkedin", value: "https://www.linkedin.com/in/example-person" },
  { kind: "website", value: "https://example.com/portfolio" },
];
describe("platform directories", () => {
  test("validates and canonicalizes each platform", () => {
    expect(normalizeProfile("github", "@Example").url).toBe(
      "https://github.com/example",
    );
    expect(normalizeProfile("linkedin", "example-person").url).toBe(
      "https://www.linkedin.com/in/example-person",
    );
    expect(normalizeProfile("website", "example.com/portfolio").url).toBe(
      "https://example.com/portfolio",
    );
    for (const [kind, value] of [
      ["github", "https://evil.test/example"],
      ["github", "https://github.com/example/repo"],
      ["linkedin", "https://linkedin.com/company/example"],
      ["linkedin", "https://evil.test/in/example"],
      ["website", "javascript:alert(1)"],
      ["website", "http://example.com"],
      ["website", "https://localhost"],
      ["website", "https://127.0.0.1"],
      ["website", "https://secret:password@example.com"],
    ] as [DirectoryKind, string][])
      expect(() => normalizeProfile(kind, value)).toThrow();
  });
  test("localized LinkedIn profile links retain the same canonical identity", () => {
    expect(
      normalizeProfile("linkedin", "https://es.linkedin.com/in/example-person")
        .url,
    ).toBe("https://www.linkedin.com/in/example-person");
    const p = normalizeProfile(
      "linkedin",
      "https://www.linkedin.com/in/jos%C3%A9-example",
    );
    expect(normalizeProfile("linkedin", p.value).url).toBe(p.url);
    expect(() =>
      normalizeProfile("linkedin", "https://linkedin.com.evil.test/in/example"),
    ).toThrow();
  });
  test("anonymous callers cannot read or edit any directory", async () => {
    const t = setup();
    for (const input of inputs) {
      await expect(
        t.query(api.profiles.viewer, { kind: input.kind }),
      ).rejects.toThrow();
      await expect(
        t.query(api.profiles.list, {
          kind: input.kind,
          paginationOpts: { numItems: 24, cursor: null },
        }),
      ).rejects.toThrow();
      await expect(t.mutation(api.profiles.save, input)).rejects.toThrow();
    }
  });
  test("platform visibility is independent and responses contain only links", async () => {
    const t = setup(),
      c = await member(t);
    for (const input of inputs) {
      await c.mutation(api.profiles.save, input);
      expect(
        (await c.query(api.profiles.viewer, { kind: input.kind })).published,
      ).toBe(false);
      expect(
        (
          await c.query(api.profiles.list, {
            kind: input.kind,
            paginationOpts: { numItems: 24, cursor: null },
          })
        ).page,
      ).toEqual([]);
    }
    await c.mutation(api.profiles.publish, { kind: "github", published: true });
    const result = await c.query(api.profiles.list, {
      kind: "github",
      paginationOpts: { numItems: 24, cursor: null },
    });
    expect(result.page[0]).toEqual({
      value: "example",
      label: "@example",
      url: "https://github.com/example",
    });
    expect(JSON.stringify(result)).not.toContain("12025550123");
    expect(
      (
        await c.query(api.profiles.list, {
          kind: "linkedin",
          paginationOpts: { numItems: 24, cursor: null },
        })
      ).page,
    ).toEqual([]);
    await c.mutation(api.profiles.remove, { kind: "github" });
    expect(
      (await c.query(api.profiles.viewer, { kind: "github" })).value,
    ).toBeNull();
    expect(
      (await c.query(api.profiles.viewer, { kind: "website" })).value,
    ).toBe("https://example.com/portfolio");
  });
  test("members cannot overwrite another member's social account", async () => {
    const t = setup(),
      a = await member(t),
      b = await member(t, "+12025550124");
    await a.mutation(api.profiles.save, inputs[0]);
    await expect(
      b.mutation(api.profiles.save, { kind: "github", value: "EXAMPLE" }),
    ).rejects.toThrow();
    expect(
      (await b.query(api.profiles.viewer, { kind: "github" })).value,
    ).toBeNull();
  });
  test("revocation hides all platforms and reactivation requires fresh publication", async () => {
    const t = setup(),
      a = await member(t),
      b = await member(t, "+12025550124");
    for (const input of inputs) {
      await a.mutation(api.profiles.save, input);
      await a.mutation(api.profiles.publish, {
        kind: input.kind,
        published: true,
      });
    }
    await t.mutation(internal.members.setActive, {
      phone: "+12025550123",
      active: false,
    });
    for (const input of inputs)
      expect(
        (
          await b.query(api.profiles.list, {
            kind: input.kind,
            paginationOpts: { numItems: 24, cursor: null },
          })
        ).page,
      ).toEqual([]);
    await expect(
      a.mutation(api.profiles.remove, { kind: "github" }),
    ).rejects.toThrow();
    await t.mutation(internal.members.setActive, {
      phone: "+12025550123",
      active: true,
    });
    for (const input of inputs)
      expect(
        (await a.query(api.profiles.viewer, { kind: input.kind })).published,
      ).toBe(false);
  });
  test("existing X profiles retain their publication and compatibility", async () => {
    const t = setup(),
      c = await member(t);
    await c.mutation(api.members.linkX, { username: "example" });
    await c.mutation(api.members.setPublished, { published: true });
    expect(await c.query(api.profiles.viewer, { kind: "x" })).toEqual({
      value: "example",
      published: true,
    });
    expect(
      (
        await c.query(api.profiles.list, {
          kind: "x",
          paginationOpts: { numItems: 24, cursor: null },
        })
      ).page[0].url,
    ).toBe("https://x.com/example");
    await c.mutation(api.profiles.save, inputs[0]);
    expect((await c.query(api.members.viewer)).published).toBe(true);
  });
});

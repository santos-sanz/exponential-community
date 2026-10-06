import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { generateKeyPair, exportPKCS8 } from "jose";
import { beforeAll, describe, expect, test } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { normalizePhone } from "../lib/phone";
import { normalizeXUsername } from "../lib/x";
beforeAll(async () => {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  process.env.JWT_PRIVATE_KEY = await exportPKCS8(privateKey);
  process.env.CONVEX_SITE_URL = "https://test.convex.site";
});
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const phone = "+12025550123",
  secondPhone = "+12025550124";
function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}
async function member(t: ReturnType<typeof setup>, number = phone) {
  await t.mutation(internal.members.importPhones, { phones: [number] });
  const userId = await t.mutation(internal.members.admit, { phone: number });
  if (!userId) throw new Error("Test admission failed");
  const memberId = await t.run(
    async (ctx) =>
      (await ctx.db
        .query("members")
        .withIndex("by_phone", (q) => q.eq("phone", number))
        .unique())!._id,
  );
  return {
    userId,
    memberId,
    client: t.withIdentity({ subject: `${userId}|test-session` }),
  };
}
describe("private community directory", () => {
  test("normalizes international numbers and rejects missing prefix", () => {
    expect(normalizePhone(" +1 202 555 0123 ")).toBe(phone);
    expect(() => normalizePhone("2025550123")).toThrow();
    expect(() => normalizePhone("+123")).toThrow();
  });
  test("import is atomic, normalized and idempotent", async () => {
    const t = setup();
    await expect(
      t.mutation(internal.members.importPhones, { phones: [phone, "invalid"] }),
    ).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query("members").take(10))).toEqual([]);
    expect(
      await t.mutation(internal.members.importPhones, {
        phones: [phone, "+1 202 555 0123"],
      }),
    ).toEqual({ inserted: 1, existing: 0 });
    expect(
      await t.mutation(internal.members.importPhones, { phones: [phone] }),
    ).toEqual({ inserted: 0, existing: 1 });
  });
  test("anonymous users cannot read or edit the directory", async () => {
    const t = setup();
    await expect(
      t.query(api.members.directory, {
        paginationOpts: { numItems: 24, cursor: null },
      }),
    ).rejects.toThrow();
    await expect(t.query(api.members.viewer)).rejects.toThrow();
    await expect(
      t.mutation(api.members.setPublished, { published: true }),
    ).rejects.toThrow();
    await expect(t.mutation(api.members.unlink)).rejects.toThrow();
  });
  test("unlisted and revoked numbers cannot obtain admission", async () => {
    const t = setup();
    expect(await t.mutation(internal.members.admit, { phone })).toBeNull();
    await t.mutation(internal.members.importPhones, { phones: [phone] });
    await t.mutation(internal.members.setActive, { phone, active: false });
    expect(await t.mutation(internal.members.admit, { phone })).toBeNull();
    await t.mutation(internal.members.importPhones, { phones: [phone] });
    expect(await t.mutation(internal.members.admit, { phone })).toBeNull();
  });
  test("phone-only auth creates a session without a code and reuses the member", async () => {
    const t = setup();
    process.env.SITE_URL = "http://localhost:3000";
    await t.mutation(internal.members.importPhones, { phones: [phone] });
    const first = await t.action(api.auth.signIn, {
      provider: "phone",
      params: { phone },
      calledBy: "test",
    });
    expect(first).toHaveProperty("tokens");
    expect(first.tokens?.token).toBeTruthy();
    const second = await t.action(api.auth.signIn, {
      provider: "phone",
      params: { phone },
      calledBy: "test",
    });
    expect(second.tokens?.token).toBeTruthy();
    expect(await t.run((ctx) => ctx.db.query("users").take(10))).toHaveLength(
      1,
    );
  });
  test("admission is idempotent and rate limited per member", async () => {
    const t = setup();
    const { userId } = await member(t);
    for (let i = 0; i < 4; i++)
      expect(await t.mutation(internal.members.admit, { phone })).toEqual(
        userId,
      );
    expect(await t.mutation(internal.members.admit, { phone })).toBeNull();
  });
  test("admitted members can browse without sharing a profile", async () => {
    const t = setup();
    const { client } = await member(t);
    expect(await client.query(api.members.viewer)).toEqual({
      username: null,
      published: false,
    });
    expect(
      (
        await client.query(api.members.directory, {
          paginationOpts: { numItems: 24, cursor: null },
        })
      ).page,
    ).toEqual([]);
    await expect(
      client.mutation(api.members.setPublished, { published: true }),
    ).rejects.toThrow();
  });
  test("only opted-in active X profiles are returned, without private data", async () => {
    const t = setup();
    const { client } = await member(t);
    await client.mutation(api.members.linkX, { username: "@Example" });
    expect(
      (
        await client.query(api.members.directory, {
          paginationOpts: { numItems: 24, cursor: null },
        })
      ).page,
    ).toEqual([]);
    await client.mutation(api.members.setPublished, { published: true });
    const result = await client.query(api.members.directory, {
      paginationOpts: { numItems: 24, cursor: null },
    });
    expect(result.page).toEqual([
      { username: "example", url: "https://x.com/example" },
    ]);
    expect(JSON.stringify(result)).not.toContain(phone);
    expect(Object.keys(result.page[0]).sort()).toEqual(["url", "username"]);
    await client.mutation(api.members.setPublished, { published: false });
    expect(
      (
        await client.query(api.members.directory, {
          paginationOpts: { numItems: 24, cursor: null },
        })
      ).page,
    ).toEqual([]);
  });
  test("revocation blocks existing sessions and removes published profiles", async () => {
    const t = setup();
    const a = await member(t),
      b = await member(t, secondPhone);
    await a.client.mutation(api.members.linkX, { username: "example" });
    await a.client.mutation(api.members.setPublished, { published: true });
    await t.mutation(internal.members.setActive, { phone, active: false });
    await expect(a.client.query(api.members.viewer)).rejects.toThrow();
    await expect(
      a.client.query(api.members.directory, {
        paginationOpts: { numItems: 24, cursor: null },
      }),
    ).rejects.toThrow();
    await expect(a.client.mutation(api.members.unlink)).rejects.toThrow();
    expect(
      (
        await b.client.query(api.members.directory, {
          paginationOpts: { numItems: 24, cursor: null },
        })
      ).page,
    ).toEqual([]);
  });
  test("one X identity cannot be attached to two members", async () => {
    const t = setup();
    const a = await member(t),
      b = await member(t, secondPhone);
    await a.client.mutation(api.members.linkX, { username: "example" });
    await expect(
      b.client.mutation(api.members.linkX, { username: "@EXAMPLE" }),
    ).rejects.toThrow();
  });
  test("unlink removes the public profile and releases the username", async () => {
    const t = setup();
    const a = await member(t),
      b = await member(t, secondPhone);
    await a.client.mutation(api.members.linkX, { username: "example" });
    await a.client.mutation(api.members.setPublished, { published: true });
    await a.client.mutation(api.members.unlink);
    expect(await a.client.query(api.members.viewer)).toEqual({
      username: null,
      published: false,
    });
    expect(
      (
        await a.client.query(api.members.directory, {
          paginationOpts: { numItems: 24, cursor: null },
        })
      ).page,
    ).toEqual([]);
    await b.client.mutation(api.members.linkX, { username: "example" });
    expect((await b.client.query(api.members.viewer)).username).toEqual(
      "example",
    );
  });
  test("username validation excludes unsafe links and reserved routes", async () => {
    const t = setup();
    const a = await member(t);
    expect(normalizeXUsername(" @Some_User ")).toEqual("some_user");
    for (const invalid of [
      "https://evil.test",
      "../users",
      "<script>",
      "two words",
      "explore",
      "",
      "abcdefghijklmnop",
    ]) {
      expect(() => normalizeXUsername(invalid)).toThrow();
      await expect(
        a.client.mutation(api.members.linkX, { username: invalid }),
      ).rejects.toThrow();
    }
    await expect(
      t.mutation(api.members.linkX, { username: "example" }),
    ).rejects.toThrow();
  });
  test("changing a username requires renewed publication consent", async () => {
    const t = setup();
    const a = await member(t);
    await a.client.mutation(api.members.linkX, { username: "example" });
    await a.client.mutation(api.members.setPublished, { published: true });
    await a.client.mutation(api.members.linkX, { username: "new_example" });
    expect(await a.client.query(api.members.viewer)).toEqual({
      username: "new_example",
      published: false,
    });
    expect(
      (
        await a.client.query(api.members.directory, {
          paginationOpts: { numItems: 24, cursor: null },
        })
      ).page,
    ).toEqual([]);
  });
});

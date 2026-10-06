import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const hash = "a".repeat(64);
const profile = {
  username: "@Example",
  sharedBy: "A person who shared the link",
  sharedAt: "2026-10-06",
  sharedByUnreadable: false,
  sourceRow: 1,
};
const payload = {
  sourceFile: "profiles.pdf",
  sourceSha256: hash,
  profiles: [profile],
};
describe("private X import staging", () => {
  test("preserves source context without granting membership or access", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(internal.xProfiles.importBatch, payload)).toEqual({
      inserted: 1,
      existing: 0,
    });
    const rows = await t.run((ctx) =>
      ctx.db.query("importedXProfiles").take(5),
    );
    expect(rows[0]).toMatchObject({
      username: "example",
      sourceUsername: "Example",
      sharedBy: profile.sharedBy,
      sourceSha256: hash,
    });
    expect(await t.run((ctx) => ctx.db.query("members").take(5))).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("users").take(5))).toEqual([]);
    await expect(
      t.query(api.members.directory, {
        paginationOpts: { numItems: 24, cursor: null },
      }),
    ).rejects.toThrow();
  });
  test("normalizes usernames and imports idempotently without overwriting provenance", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.xProfiles.importBatch, payload);
    expect(
      await t.mutation(internal.xProfiles.importBatch, {
        ...payload,
        sourceSha256: "b".repeat(64),
        profiles: [
          { ...profile, username: "EXAMPLE", sharedBy: "Someone else" },
        ],
      }),
    ).toEqual({ inserted: 0, existing: 1 });
    expect(
      (await t.run((ctx) => ctx.db.query("importedXProfiles").take(5)))[0],
    ).toMatchObject({ sharedBy: profile.sharedBy, sourceSha256: hash });
  });
  test("missing or unreadable source names remain unassigned", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.xProfiles.importBatch, {
      ...payload,
      profiles: [
        {
          ...profile,
          sharedBy: null,
          sharedAt: null,
          sharedByUnreadable: true,
        },
      ],
    });
    expect(
      (await t.run((ctx) => ctx.db.query("importedXProfiles").take(5)))[0],
    ).toMatchObject({
      sharedBy: null,
      sharedAt: null,
      sharedByUnreadable: true,
    });
  });
  test("malformed rows reject the entire batch", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.xProfiles.importBatch, {
        ...payload,
        profiles: [profile, { ...profile, username: "../invalid" }],
      }),
    ).rejects.toThrow();
    expect(
      await t.run((ctx) => ctx.db.query("importedXProfiles").take(5)),
    ).toEqual([]);
    await expect(
      t.mutation(internal.xProfiles.importBatch, {
        ...payload,
        profiles: [{ ...profile, sharedByUnreadable: true }],
      }),
    ).rejects.toThrow();
  });
  test("audit reports missing records and differing sources accurately", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.xProfiles.importBatch, payload);
    expect(
      await t.query(internal.xProfiles.auditBatch, {
        usernames: ["@EXAMPLE", "example", "missing"],
        sourceSha256: hash,
      }),
    ).toEqual({ matched: 1, missing: ["missing"], differentSource: [] });
    expect(
      await t.query(internal.xProfiles.auditBatch, {
        usernames: ["example"],
        sourceSha256: "b".repeat(64),
      }),
    ).toEqual({ matched: 0, missing: [], differentSource: ["example"] });
  });
});

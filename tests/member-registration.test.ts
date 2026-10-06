import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const registration = {
  phone: "+12025550123",
  username: "@Example",
  published: true,
};
describe("operator-only manual registration", () => {
  test("registers phone and X idempotently without creating an auth session", async () => {
    const t = convexTest(schema, modules);
    expect(
      await t.mutation(internal.members.registerMember, registration),
    ).toEqual({ created: true, username: "example", published: true });
    expect(
      await t.mutation(internal.members.registerMember, registration),
    ).toEqual({ created: false, username: "example", published: true });
    const rows = await t.run((ctx) => ctx.db.query("members").take(5));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      phone: registration.phone,
      active: true,
      xUsername: "example",
      published: true,
    });
    expect(await t.run((ctx) => ctx.db.query("users").take(5))).toEqual([]);
  });
  test("prevents claiming another member's X account", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.members.registerMember, registration);
    await expect(
      t.mutation(internal.members.registerMember, {
        ...registration,
        phone: "+12025550124",
      }),
    ).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query("members").take(5))).toHaveLength(
      1,
    );
  });
  test("validates both fields before any write", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.members.registerMember, {
        ...registration,
        phone: "2025550123",
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(internal.members.registerMember, {
        ...registration,
        username: "../invalid",
      }),
    ).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query("members").take(5))).toEqual([]);
  });
});

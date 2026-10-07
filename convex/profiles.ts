import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation } from "./_generated/server";
import { authorizedMember } from "./access";
import { normalizeProfile } from "../lib/profiles";
import { limits } from "./limits";
const kind = v.union(
  v.literal("x"),
  v.literal("github"),
  v.literal("linkedin"),
  v.literal("website"),
);
export const viewer = query({
  args: { kind },
  returns: v.object({
    value: v.union(v.string(), v.null()),
    published: v.boolean(),
  }),
  handler: async (ctx, { kind }) => {
    const member = await authorizedMember(ctx);
    if (kind === "x")
      return { value: member.xUsername ?? null, published: member.published };
    const p = await ctx.db
      .query("profileLinks")
      .withIndex("by_memberId_and_kind", (q) =>
        q.eq("memberId", member._id).eq("kind", kind),
      )
      .unique();
    return { value: p?.value ?? null, published: p?.published ?? false };
  },
});
export const list = query({
  args: { kind, paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(
      v.object({ label: v.string(), url: v.string(), value: v.string() }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { kind, paginationOpts }) => {
    await authorizedMember(ctx);
    if (paginationOpts.numItems < 1 || paginationOpts.numItems > 50)
      throw new ConvexError("Tamaño de página no válido.");
    if (kind === "x") {
      const result = await ctx.db
        .query("members")
        .withIndex("by_active_and_published", (q) =>
          q.eq("active", true).eq("published", true),
        )
        .paginate(paginationOpts);
      return {
        page: result.page.flatMap((m) =>
          m.xUsername ? [normalizeProfile(kind, m.xUsername)] : [],
        ),
        isDone: result.isDone,
        continueCursor: result.continueCursor,
      };
    }
    const result = await ctx.db
      .query("profileLinks")
      .withIndex("by_kind_and_published", (q) =>
        q.eq("kind", kind).eq("published", true),
      )
      .paginate(paginationOpts);
    const page = [];
    for (const p of result.page) {
      const member = await ctx.db.get(p.memberId);
      if (member?.active) page.push(normalizeProfile(kind, p.value));
    }
    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
export const save = mutation({
  args: { kind, value: v.string() },
  returns: v.null(),
  handler: async (ctx, { kind, value }) => {
    const member = await authorizedMember(ctx),
      p = normalizeProfile(kind, value);
    await limits.limit(ctx, "profileChange", { key: member._id, throws: true });
    if (kind === "x") {
      const owner = await ctx.db
        .query("members")
        .withIndex("by_xUsername", (q) => q.eq("xUsername", p.value))
        .unique();
      if (owner && owner._id !== member._id)
        throw new ConvexError(
          "Esta cuenta de X ya está vinculada a otro miembro.",
        );
      await ctx.db.patch(member._id, { xUsername: p.value, published: false });
      return null;
    }
    if (kind !== "website") {
      const owner = await ctx.db
        .query("profileLinks")
        .withIndex("by_kind_and_value", (q) =>
          q.eq("kind", kind).eq("value", p.value),
        )
        .unique();
      if (owner && owner.memberId !== member._id)
        throw new ConvexError("Esta cuenta ya está vinculada a otro miembro.");
    }
    const existing = await ctx.db
      .query("profileLinks")
      .withIndex("by_memberId_and_kind", (q) =>
        q.eq("memberId", member._id).eq("kind", kind),
      )
      .unique();
    if (existing)
      await ctx.db.patch(existing._id, { value: p.value, published: false });
    else
      await ctx.db.insert("profileLinks", {
        memberId: member._id,
        kind,
        value: p.value,
        published: false,
      });
    return null;
  },
});
export const publish = mutation({
  args: { kind, published: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { kind, published }) => {
    const member = await authorizedMember(ctx);
    if (kind === "x") {
      if (published && !member.xUsername)
        throw new ConvexError("Añade tu cuenta primero.");
      await ctx.db.patch(member._id, { published });
      return null;
    }
    const p = await ctx.db
      .query("profileLinks")
      .withIndex("by_memberId_and_kind", (q) =>
        q.eq("memberId", member._id).eq("kind", kind),
      )
      .unique();
    if (!p) throw new ConvexError("Añade tu enlace primero.");
    await ctx.db.patch(p._id, { published });
    return null;
  },
});
export const remove = mutation({
  args: { kind },
  returns: v.null(),
  handler: async (ctx, { kind }) => {
    const member = await authorizedMember(ctx);
    if (kind === "x") {
      await ctx.db.patch(member._id, {
        xUsername: undefined,
        published: false,
      });
      return null;
    }
    const p = await ctx.db
      .query("profileLinks")
      .withIndex("by_memberId_and_kind", (q) =>
        q.eq("memberId", member._id).eq("kind", kind),
      )
      .unique();
    if (p) await ctx.db.delete(p._id);
    return null;
  },
});

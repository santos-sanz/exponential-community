import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authorizedMember } from "./access";
import { normalizePhone } from "../lib/phone";
import { normalizeXUsername } from "../lib/x";
import { limits } from "./limits";
export const viewer = query({
  args: {},
  returns: v.object({
    username: v.union(v.string(), v.null()),
    published: v.boolean(),
  }),
  handler: async (ctx) => {
    const member = await authorizedMember(ctx);
    return { username: member.xUsername ?? null, published: member.published };
  },
});
export const directory = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(v.object({ username: v.string(), url: v.string() })),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { paginationOpts }) => {
    await authorizedMember(ctx);
    if (paginationOpts.numItems < 1 || paginationOpts.numItems > 50)
      throw new ConvexError("Tamaño de página no válido.");
    const result = await ctx.db
      .query("members")
      .withIndex("by_active_and_published", (q) =>
        q.eq("active", true).eq("published", true),
      )
      .paginate(paginationOpts);
    return {
      page: result.page.flatMap((m) =>
        m.xUsername
          ? [{ username: m.xUsername, url: `https://x.com/${m.xUsername}` }]
          : [],
      ),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
export const linkX = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: async (ctx, { username }) => {
    const member = await authorizedMember(ctx);
    const normalized = normalizeXUsername(username);
    await limits.limit(ctx, "profileChange", { key: member._id, throws: true });
    const existing = await ctx.db
      .query("members")
      .withIndex("by_xUsername", (q) => q.eq("xUsername", normalized))
      .unique();
    if (existing && existing._id !== member._id)
      throw new ConvexError(
        "Esta cuenta de X ya está vinculada a otro miembro.",
      );
    await ctx.db.patch(member._id, { xUsername: normalized, published: false });
    return null;
  },
});

export const setPublished = mutation({
  args: { published: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { published }) => {
    const member = await authorizedMember(ctx);
    if (published && !member.xUsername)
      throw new ConvexError("Vincula tu cuenta de X primero.");
    await ctx.db.patch(member._id, { published });
    return null;
  },
});
export const unlink = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const member = await authorizedMember(ctx);
    await ctx.db.patch(member._id, { xUsername: undefined, published: false });
    return null;
  },
});
export const admit = internalMutation({
  args: { phone: v.string() },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, { phone }) => {
    const normalized = normalizePhone(phone);
    if (!(await limits.limit(ctx, "loginGlobal")).ok) return null;
    const member = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();
    if (!member?.active) return null;
    if (!(await limits.limit(ctx, "loginPhone", { key: normalized })).ok)
      return null;
    if (member.userId) {
      const user = await ctx.db.get(member.userId);
      if (user?.phone === normalized) return user._id;
    }
    const userId = await ctx.db.insert("users", { phone: normalized });
    await ctx.db.patch(member._id, { userId });
    return userId;
  },
});

// Internal CLI-only administration: no browser endpoint exposes phone imports.
export const importPhones = internalMutation({
  args: { phones: v.array(v.string()) },
  returns: v.object({ inserted: v.number(), existing: v.number() }),
  handler: async (ctx, { phones }) => {
    if (phones.length > 250)
      throw new Error("Importa como máximo 250 teléfonos por lote.");
    const normalized = [
      ...new Set(phones.map((phone) => normalizePhone(phone))),
    ];
    let inserted = 0,
      existing = 0;
    for (const phone of normalized) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .unique();
      if (member) existing++;
      else {
        await ctx.db.insert("members", {
          phone,
          active: true,
          published: false,
        });
        inserted++;
      }
    }
    return { inserted, existing };
  },
});
export const setActive = internalMutation({
  args: { phone: v.string(), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { phone, active }) => {
    const normalized = normalizePhone(phone);
    const member = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();
    if (!member) throw new Error("Miembro no encontrado.");
    await ctx.db.patch(member._id, { active, published: false });
    return null;
  },
});

// Manual registration is an operator-only action, never a browser endpoint.
export const registerMember = internalMutation({
  args: { phone: v.string(), username: v.string(), published: v.boolean() },
  returns: v.object({
    created: v.boolean(),
    username: v.string(),
    published: v.boolean(),
  }),
  handler: async (ctx, { phone, username, published }) => {
    const normalizedPhone = normalizePhone(phone);
    const normalizedUsername = normalizeXUsername(username);
    const member = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", normalizedPhone))
      .unique();
    const owner = await ctx.db
      .query("members")
      .withIndex("by_xUsername", (q) => q.eq("xUsername", normalizedUsername))
      .unique();
    if (owner && owner._id !== member?._id)
      throw new ConvexError(
        "Esta cuenta de X ya está vinculada a otro miembro.",
      );
    if (member)
      await ctx.db.patch(member._id, {
        active: true,
        xUsername: normalizedUsername,
        published,
      });
    else
      await ctx.db.insert("members", {
        phone: normalizedPhone,
        active: true,
        xUsername: normalizedUsername,
        published,
      });
    return { created: !member, username: normalizedUsername, published };
  },
});

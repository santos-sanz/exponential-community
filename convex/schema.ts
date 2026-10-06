import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  ...authTables,
  importedXProfiles: defineTable({
    username: v.string(),
    sourceUsername: v.string(),
    sharedBy: v.union(v.string(), v.null()),
    sharedAt: v.union(v.string(), v.null()),
    sharedByUnreadable: v.boolean(),
    sourceRow: v.number(),
    sourceFile: v.string(),
    sourceSha256: v.string(),
    importedAt: v.number(),
  }).index("by_username", ["username"]),
  members: defineTable({
    phone: v.string(),
    active: v.boolean(),
    published: v.boolean(),
    userId: v.optional(v.id("users")),
    xUsername: v.optional(v.string()),
  })
    .index("by_phone", ["phone"])
    .index("by_userId", ["userId"])
    .index("by_xUsername", ["xUsername"])
    .index("by_active_and_published", ["active", "published"]),
});

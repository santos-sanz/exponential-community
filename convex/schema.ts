import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  ...authTables,
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

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";
export async function authorizedMember(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Accede con tu teléfono para continuar.");
  const user = await ctx.db.get(userId);
  if (!user?.phone)
    throw new ConvexError("Accede con tu teléfono para continuar.");
  const phone = user.phone;
  const member = await ctx.db
    .query("members")
    .withIndex("by_phone", (q) => q.eq("phone", phone))
    .unique();
  if (!member?.active || member.userId !== userId)
    throw new ConvexError("Tu acceso a la comunidad no está activo.");
  return member;
}

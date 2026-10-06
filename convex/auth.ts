import { convexAuth } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { internal } from "./_generated/api";
import { normalizePhone } from "../lib/phone";
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    ConvexCredentials({
      id: "phone",
      async authorize(credentials, ctx) {
        if (typeof credentials.phone !== "string") return null;
        const userId = await ctx.runMutation(internal.members.admit, {
          phone: normalizePhone(credentials.phone),
        });
        return userId ? { userId } : null;
      },
    }),
  ],
  session: { totalDurationMs: 7 * 24 * 60 * 60 * 1000 },
});

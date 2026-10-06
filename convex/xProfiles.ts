import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { normalizeXUsername } from "../lib/x";

const profile = v.object({
  username: v.string(),
  sharedBy: v.union(v.string(), v.null()),
  sharedAt: v.union(v.string(), v.null()),
  sharedByUnreadable: v.boolean(),
  sourceRow: v.number(),
});

// Staged source data only. Sharing an X link does not establish ownership,
// membership, phone access or consent to publish it in the directory.
export const importBatch = internalMutation({
  args: {
    sourceFile: v.string(),
    sourceSha256: v.string(),
    profiles: v.array(profile),
  },
  returns: v.object({ inserted: v.number(), existing: v.number() }),
  handler: async (ctx, args) => {
    if (args.profiles.length > 250)
      throw new Error("Máximo 250 perfiles por lote.");
    if (!/^[a-f0-9]{64}$/.test(args.sourceSha256))
      throw new Error("Huella del archivo no válida.");
    if (!args.sourceFile || args.sourceFile.length > 200)
      throw new Error("Nombre del archivo no válido.");
    const profiles = args.profiles.map((p) => {
      if (
        p.sharedAt &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(p.sharedAt) ||
          !Number.isFinite(Date.parse(p.sharedAt)))
      )
        throw new Error("Fecha no válida.");
      if (!Number.isInteger(p.sourceRow) || p.sourceRow < 1)
        throw new Error("Fila de origen no válida.");
      if (p.sharedBy && p.sharedBy.length > 200)
        throw new Error("Nombre de origen demasiado largo.");
      if (p.sharedByUnreadable && p.sharedBy !== null)
        throw new Error("Un nombre ilegible no se puede atribuir.");
      return { ...p, normalized: normalizeXUsername(p.username) };
    });
    let inserted = 0,
      existing = 0;
    for (const p of profiles) {
      const found = await ctx.db
        .query("importedXProfiles")
        .withIndex("by_username", (q) => q.eq("username", p.normalized))
        .unique();
      if (found) {
        existing++;
        continue;
      }
      await ctx.db.insert("importedXProfiles", {
        username: p.normalized,
        sourceUsername: p.username.trim().replace(/^@/, ""),
        sharedBy: p.sharedBy,
        sharedAt: p.sharedAt,
        sharedByUnreadable: p.sharedByUnreadable,
        sourceRow: p.sourceRow,
        sourceFile: args.sourceFile,
        sourceSha256: args.sourceSha256,
        importedAt: Date.now(),
      });
      inserted++;
    }
    return { inserted, existing };
  },
});

export const auditBatch = internalQuery({
  args: { usernames: v.array(v.string()), sourceSha256: v.string() },
  returns: v.object({
    matched: v.number(),
    missing: v.array(v.string()),
    differentSource: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    if (args.usernames.length > 250)
      throw new Error("Máximo 250 perfiles por lote.");
    const usernames = [...new Set(args.usernames.map(normalizeXUsername))];
    let matched = 0;
    const missing: string[] = [],
      differentSource: string[] = [];
    for (const username of usernames) {
      const p = await ctx.db
        .query("importedXProfiles")
        .withIndex("by_username", (q) => q.eq("username", username))
        .unique();
      if (!p) missing.push(username);
      else if (p.sourceSha256 !== args.sourceSha256)
        differentSource.push(username);
      else matched++;
    }
    return { matched, missing, differentSource };
  },
});

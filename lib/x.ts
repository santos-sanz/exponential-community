export function normalizeXUsername(value: string): string {
  const username = value.trim().replace(/^@/, "").toLowerCase();
  if (
    !/^[a-z0-9_]{1,15}$/.test(username) ||
    [
      "home",
      "explore",
      "notifications",
      "messages",
      "i",
      "intent",
      "settings",
      "search",
    ].includes(username)
  ) {
    throw new Error(
      "Introduce un @usuario de X válido, de hasta 15 caracteres.",
    );
  }
  return username;
}

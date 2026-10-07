export function normalizeXUsername(value: string): string {
  let text = value.trim();
  if (/^https?:\/\//i.test(text)) {
    const url = new URL(text);
    if (
      url.protocol !== "https:" ||
      !["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(
        url.hostname,
      ) ||
      url.username ||
      url.password ||
      url.port ||
      !/^\/[A-Za-z0-9_]{1,15}\/?$/.test(url.pathname)
    )
      throw new Error(
        "Pega un enlace de perfil de X válido, no un enlace a una publicación.",
      );
    text = url.pathname.replace(/^\/|\/$/g, "");
  }
  const username = text.replace(/^@/, "").toLowerCase();
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
  )
    throw new Error(
      "Introduce un @usuario de X válido, de hasta 15 caracteres.",
    );
  return username;
}

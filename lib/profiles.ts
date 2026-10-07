import { normalizeXUsername } from "./x";
export type DirectoryKind = "x" | "github" | "linkedin" | "website";
export const directoryKinds: {
  kind: DirectoryKind;
  label: string;
  placeholder: string;
}[] = [
  { kind: "x", label: "X", placeholder: "@usuario o enlace de X" },
  {
    kind: "github",
    label: "GitHub",
    placeholder: "usuario o https://github.com/usuario",
  },
  {
    kind: "linkedin",
    label: "LinkedIn",
    placeholder: "https://www.linkedin.com/in/usuario",
  },
  { kind: "website", label: "Webs", placeholder: "https://tu-web.com" },
];
export function normalizeProfile(
  kind: DirectoryKind,
  input: string,
): { value: string; label: string; url: string } {
  let value = input.trim();
  if (!value || value.length > 500)
    throw new Error("Introduce un enlace válido de hasta 500 caracteres.");
  if (kind === "x") {
    value = normalizeXUsername(value);
    return { value, label: `@${value}`, url: `https://x.com/${value}` };
  }
  if (kind === "github") {
    if (/^https?:\/\//i.test(value)) {
      const u = new URL(value);
      if (
        u.protocol !== "https:" ||
        !["github.com", "www.github.com"].includes(u.hostname) ||
        u.username ||
        u.password ||
        u.port ||
        !/^\/[A-Za-z0-9-]{1,39}\/?$/.test(u.pathname)
      )
        throw new Error("Usa un enlace a un perfil de GitHub.");
      value = u.pathname.replace(/^\/|\/$/g, "");
    }
    value = value.replace(/^@/, "").toLowerCase();
    if (
      !/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/.test(value) ||
      value.includes("--") ||
      [
        "login",
        "settings",
        "explore",
        "features",
        "marketplace",
        "orgs",
        "topics",
        "search",
        "about",
        "pricing",
        "join",
        "apps",
      ].includes(value)
    )
      throw new Error("Introduce un usuario de GitHub válido.");
    return { value, label: `@${value}`, url: `https://github.com/${value}` };
  }
  if (kind === "linkedin" && /^[\p{L}\p{M}\p{N}_-]{3,100}$/u.test(value))
    value = `https://www.linkedin.com/in/${value}`;
  if (!/^https:\/\//i.test(value)) value = `https://${value}`;
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || u.port)
    throw new Error("Usa una URL HTTPS sin credenciales ni puertos.");
  if (kind === "linkedin") {
    const match = u.pathname.match(/^\/in\/([^/]+)\/?$/);
    const slug = match ? decodeURIComponent(match[1]).normalize("NFC") : "";
    if (
      !(
        u.hostname === "linkedin.com" ||
        /^(?:www|[a-z]{2})\.linkedin\.com$/.test(u.hostname)
      ) ||
      !/^[\p{L}\p{M}\p{N}_-]{3,100}$/u.test(slug)
    )
      throw new Error("Usa un perfil personal: linkedin.com/in/usuario.");
    value = slug.toLowerCase().normalize("NFC");
    return {
      value,
      label: value,
      url: `https://www.linkedin.com/in/${encodeURIComponent(value)}`,
    };
  }
  if (
    !u.hostname.includes(".") ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname) ||
    u.hostname.includes(":") ||
    /\.(localhost|local|internal|test)$/.test(u.hostname)
  )
    throw new Error("Usa un dominio público para tu web.");
  u.hash = "";
  value = u.href;
  return { value, label: u.hostname.replace(/^www\./, ""), url: value };
}

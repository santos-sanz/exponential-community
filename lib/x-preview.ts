import { Parser } from "htmlparser2";
import { normalizeXUsername } from "./x";
export type XPreview = {
  username: string;
  name: string;
  bio: string;
  imageUrl: string | null;
};
export function parseXPreview(html: string, username: string): XPreview | null {
  const meta: Record<string, string> = {};
  const parser = new Parser(
    {
      onopentag(tag, attrs) {
        if (
          tag === "meta" &&
          [
            "og:type",
            "og:url",
            "og:title",
            "og:description",
            "og:image",
            "og:image:alt",
          ].includes(attrs.property)
        )
          meta[attrs.property] = attrs.content ?? "";
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();
  try {
    if (
      meta["og:type"] !== "profile" ||
      normalizeXUsername(meta["og:url"] ?? "") !== username
    )
      return null;
    const name = (
      meta["og:title"]?.split(/\s*\(@/)[0] ||
      meta["og:image:alt"] ||
      username
    )
      .trim()
      .slice(0, 100);
    let imageUrl: string | null = null;
    if (meta["og:image"]) {
      const image = new URL(meta["og:image"]);
      if (
        image.protocol === "https:" &&
        !image.username &&
        !image.password &&
        !image.port &&
        ((image.hostname === "pbs.twimg.com" &&
          image.pathname.startsWith("/profile_images/")) ||
          (image.hostname === "abs.twimg.com" &&
            image.pathname.startsWith("/sticky/default_profile_images/")))
      )
        imageUrl = image.href;
    }
    return {
      username,
      name,
      bio: (meta["og:description"] ?? "").trim().slice(0, 500),
      imageUrl,
    };
  } catch {
    return null;
  }
}

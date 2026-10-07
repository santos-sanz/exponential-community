import { expect, test } from "vitest";
import { parseXPreview } from "../lib/x-preview";
const html = `<meta property="og:type" content="profile"><meta content="https://x.com/example" property="og:url"><meta property="og:title" content="Example Person (@example) on X"><meta property="og:description" content="Data &amp; AI"><meta property="og:image" content="https://pbs.twimg.com/profile_images/123/avatar.jpg">`;
test("reads real profile metadata and decodes entities", () => {
  expect(parseXPreview(html, "example")).toEqual({
    username: "example",
    name: "Example Person",
    bio: "Data & AI",
    imageUrl: "https://pbs.twimg.com/profile_images/123/avatar.jpg",
  });
});
test("does not turn login pages or another account into a preview", () => {
  expect(parseXPreview(html, "someone_else")).toBeNull();
  expect(
    parseXPreview('<meta property="og:type" content="website">', "example"),
  ).toBeNull();
});
test("untrusted image locations are never proxied as avatars", () => {
  expect(
    parseXPreview(
      html.replace(
        "https://pbs.twimg.com/profile_images/123/avatar.jpg",
        "https://evil.test/avatar.jpg",
      ),
      "example",
    )?.imageUrl,
  ).toBeNull();
  expect(
    parseXPreview(
      html.replace(
        "https://pbs.twimg.com/profile_images/123/avatar.jpg",
        "https://secret@pbs.twimg.com/profile_images/avatar.jpg",
      ),
      "example",
    )?.imageUrl,
  ).toBeNull();
});

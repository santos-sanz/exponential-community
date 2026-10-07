import { expect, test } from "vitest";
import { normalizeXUsername } from "../lib/x";
test("profile URLs and handles normalize to the same account", () => {
  for (const input of [
    "@Example",
    "example",
    "https://x.com/Example",
    "https://twitter.com/example/",
    "https://x.com/example?s=21",
  ])
    expect(normalizeXUsername(input)).toBe("example");
});
test("cards cannot point to arbitrary hosts, posts or credential-bearing links", () => {
  for (const input of [
    "https://evil.test/example",
    "https://x.com.evil.test/example",
    "https://x.com/example/status/123",
    "https://secret@x.com/example",
    "http://x.com/example",
    "https://x.com/intent",
  ])
    expect(() => normalizeXUsername(input)).toThrow();
});

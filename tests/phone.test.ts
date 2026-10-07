import { describe, expect, test } from "vitest";
import { normalizePhone, internationalPhoneInput } from "../lib/phone";
import { phoneCountries } from "../lib/phone-countries";
import { access } from "node:fs/promises";

describe("international phone input", () => {
  test("Spain defaults to +34 without requiring a typed prefix", () => {
    expect(normalizePhone("612 345 678", "ES")).toBe("+34612345678");
    expect(normalizePhone("612\u00a0345\u202f678", "ES")).toBe("+34612345678");
    expect(normalizePhone("(612) 345-678", "ES")).toBe("+34612345678");
  });
  test("spaces and optional plus signs produce the same international identity", () => {
    for (const input of [
      "+34612345678",
      "+34 612 345 678",
      "34612345678",
      "34 612 345 678",
      "0034 612 345 678",
      "+ 34 + 612 345 678",
    ]) {
      expect(normalizePhone(input, "ES")).toBe("+34612345678");
      expect(normalizePhone(input)).toBe("+34612345678");
    }
    expect(internationalPhoneInput("34 612 345 678", "ES")?.country).toBe("ES");
    expect(internationalPhoneInput("612 345 678", "ES")).toBeNull();
  });
  test("country choices correctly normalize national and trunk-prefix formats", () => {
    expect(normalizePhone("202 555 0123", "US")).toBe("+12025550123");
    expect(normalizePhone("020 7946 0018", "GB")).toBe("+442079460018");
    expect(normalizePhone("06 12 34 56 78", "FR")).toBe("+33612345678");
  });
  test("international pastes override the selected country without duplicate prefixes", () => {
    expect(normalizePhone("+1 202 555 0123", "ES")).toBe("+12025550123");
    expect(normalizePhone("0044 20 7946 0018", "ES")).toBe("+442079460018");
    const paste = internationalPhoneInput("+44 20 7946 0018");
    expect(paste?.country).toBe("GB");
    expect(normalizePhone(paste!.national, paste!.country)).toBe(
      "+442079460018",
    );
  });
  test("server/admin paths require explicit international identity", () => {
    expect(() => normalizePhone("612345678")).toThrow(/prefijo/);
    expect(normalizePhone("+34612345678")).toBe("+34612345678");
  });
  test("rejects malformed and impossible input instead of extracting embedded digits", () => {
    for (const value of [
      "",
      "123",
      "123456789",
      "6123456789",
      "hola +34612345678",
      "+34612345678 ext 5",
      "+34+34612345678",
      "612345678<script>",
      "1".repeat(41),
      "+34 612 345 678\n999",
    ]) {
      expect(() => normalizePhone(value, "ES"), value).toThrow();
    }
    expect(internationalPhoneInput("+34")).toBeNull();
    expect(internationalPhoneInput("call +34612345678")).toBeNull();
  });
  test("all selectable countries have locally served flags and dial codes", async () => {
    expect(phoneCountries[0]).toMatchObject({
      code: "ES",
      dialCode: "+34",
      name: "España",
    });
    expect(new Set(phoneCountries.map((c) => c.code)).size).toBe(
      phoneCountries.length,
    );
    for (const country of phoneCountries) {
      expect(country.dialCode).toMatch(/^\+[1-9]\d{0,2}$/);
      await access(`public/flags/${country.code}.svg`);
    }
  });
});

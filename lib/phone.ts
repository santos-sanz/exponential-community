import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max";

function cleanPhone(value: string): string {
  const text = value.trim().replace(/[\u00a0\u202f]/g, " ");
  if (!text || text.length > 40 || !/^[0-9+() .-]+$/.test(text)) {
    throw new Error("Introduce un número válido, sin letras ni extensiones.");
  }
  return text.startsWith("00") ? `+${text.slice(2)}` : text;
}

/** National inputs require an explicit country. Server/admin calls stay E.164-only. */
export function normalizePhone(value: string, country?: CountryCode): string {
  const text = cleanPhone(value);
  if (!text.startsWith("+") && !country) {
    throw new Error("Incluye el prefijo internacional, por ejemplo +34.");
  }
  const phone = parsePhoneNumberFromString(text, {
    defaultCountry: country,
    extract: false,
  });
  if (!phone || phone.ext || !phone.isValid()) {
    throw new Error(
      "Introduce un número de teléfono válido para el país seleccionado.",
    );
  }
  return phone.number;
}

/** Recognize a complete international paste without guessing from partial digits. */
export function internationalPhoneInput(
  value: string,
): { country: CountryCode; national: string } | null {
  try {
    const text = cleanPhone(value);
    if (!text.startsWith("+")) return null;
    const phone = parsePhoneNumberFromString(text, { extract: false });
    if (!phone?.isValid() || !phone.country || phone.ext) return null;
    return { country: phone.country, national: phone.formatNational() };
  } catch {
    return null;
  }
}

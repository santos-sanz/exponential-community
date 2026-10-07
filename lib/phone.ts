import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max";

function cleanPhone(value: string): string {
  const text = value.trim();
  if (!text || text.length > 80 || !/^[0-9+() .\s-]+$/.test(text))
    throw new Error("Introduce un número válido, sin letras ni extensiones.");
  const compact = text.replace(/[+() .\s-]/g, "");
  return compact.startsWith("00")
    ? `+${compact.slice(2)}`
    : text.includes("+")
      ? `+${compact}`
      : compact;
}
function parseValid(text: string, country?: CountryCode) {
  const phone = parsePhoneNumberFromString(text, {
    defaultCountry: country,
    extract: false,
  });
  return phone?.isValid() && !phone.ext ? phone : null;
}
/** Formatting never changes identity. National numbers use the selected country. */
export function normalizePhone(value: string, country?: CountryCode): string {
  const text = cleanPhone(value);
  if (text.startsWith("+")) {
    const international = parseValid(text);
    if (international) return international.number;
    const national = country ? parseValid(text.slice(1), country) : null;
    if (national) return national.number;
  } else {
    const national = country ? parseValid(text, country) : null;
    if (national) return national.number;
    const international = parseValid(`+${text}`);
    if (international) return international.number;
    if (!country)
      throw new Error("Incluye el prefijo internacional, por ejemplo +34.");
  }
  throw new Error(
    "Introduce un número de teléfono válido para el país seleccionado.",
  );
}
export function internationalPhoneInput(
  value: string,
  country: CountryCode = "ES",
): { country: CountryCode; national: string } | null {
  try {
    const text = cleanPhone(value);
    const national = !text.startsWith("+") ? parseValid(text, country) : null;
    if (
      national &&
      text !== `${national.countryCallingCode}${national.nationalNumber}`
    )
      return null;
    const phone = parseValid(text.startsWith("+") ? text : `+${text}`);
    return phone?.country
      ? { country: phone.country, national: phone.formatNational() }
      : null;
  } catch {
    return null;
  }
}

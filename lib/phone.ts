import { parsePhoneNumberFromString } from "libphonenumber-js/min";
export function normalizePhone(value: string): string {
  const text = value.trim();
  if (!text.startsWith("+") || text.length > 40)
    throw new Error("Incluye el prefijo internacional, por ejemplo +34.");
  const phone = parsePhoneNumberFromString(text);
  if (!phone?.isValid())
    throw new Error("Introduce un número de teléfono válido.");
  return phone.number;
}

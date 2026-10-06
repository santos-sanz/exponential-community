import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
if (
  !input ||
  args.some((a) => a.startsWith("--") && !["--prod", "--apply"].includes(a))
) {
  console.error(
    "Uso: npm run import:members -- private/phones.txt [--prod] [--apply]",
  );
  process.exit(1);
}
const text = await readFile(resolve(input), "utf8");
const rows = text
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith("#"));
const phones = [];
for (let i = 0; i < rows.length; i++) {
  const value = rows[i];
  const phone = value.startsWith("+")
    ? parsePhoneNumberFromString(value)
    : null;
  if (!phone?.isValid()) {
    console.error(
      `Línea ${i + 1}: teléfono inválido. Usa prefijo internacional. No se importó ningún número.`,
    );
    process.exit(1);
  }
  phones.push(phone.number);
}
const unique = [...new Set(phones)];
console.log(
  `${unique.length} teléfonos válidos; ${phones.length - unique.length} duplicados. Destino: ${args.includes("--prod") ? "producción" : "desarrollo"}.`,
);
if (!args.includes("--apply")) {
  console.log("Validación completada. Añade --apply para importar.");
  process.exit(0);
}
for (let i = 0; i < unique.length; i += 250) {
  const command = [
    "convex",
    "run",
    ...(args.includes("--prod") ? ["--prod"] : []),
    "members:importPhones",
    JSON.stringify({ phones: unique.slice(i, i + 250) }),
  ];
  const result = spawnSync("npx", command, { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(
      `No se pudo importar el lote ${Math.floor(i / 250) + 1}. Los lotes anteriores pueden estar importados; se puede repetir sin duplicar. Revisa el acceso al proyecto de Convex.`,
    );
    process.exit(1);
  }
  console.log(`Lote ${Math.floor(i / 250) + 1}: ${result.stdout.trim()}`);
}

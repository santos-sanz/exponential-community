# Exponential Community

Directorio de miembros en X. Repositorio público, teléfonos privados. Next.js + Convex Auth + Convex + Vercel.

## Comportamiento

- España (+34) aparece seleccionada por defecto, con su bandera. El visitante escribe su número nacional, elige otro país o pega un número internacional completo. Se normaliza a E.164 y se comprueba que esté activo en la lista de Convex. No se envía SMS.
- Convex Auth crea una sesión de siete días. Cada lectura y cambio vuelve a comprobar la membresía; revocar un número bloquea también sesiones existentes.
- Un miembro puede consultar el directorio sin compartir su cuenta.
- X se vincula escribiendo el `@usuario`, sin credenciales de X. La cuenta vinculada permanece oculta hasta que el miembro marque la casilla de publicación.
- El directorio devuelve exclusivamente `username` y `url`. No devuelve teléfonos, IDs internos, nombres o tokens.
- Se puede ocultar o desvincular X. El nombre de usuario se normaliza y una cuenta no puede asociarse a dos miembros.

El acceso por teléfono es una comprobación de pertenencia, no una verificación de posesión: cualquiera que conozca un número autorizado puede acceder como ese miembro. Este es el flujo elegido para esta versión. Los usuarios de X también son autodeclarados; no se verifica su posesión.

## Desarrollo

Node.js >=22.12 (producción: Node 24).

```bash
npm ci
npx convex dev
# En otro terminal:
npx @convex-dev/auth --skip-git-check --web-server-url http://localhost:3000
npm run dev
```

Convex genera `.env.local`. Nunca publiques `.env.local` ni las claves.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Importar teléfonos (administración privada)

La lista empieza vacía. Solo operadores con acceso al proyecto de Convex pueden importar: las funciones de administración son internas, no accesibles desde el navegador.

Crea `private/phones.txt`, un teléfono por línea con prefijo internacional. Se aceptan espacios en el número, líneas vacías y comentarios que empiecen por `#`. No incluyas nombres ni cabeceras. `private/`, los CSV y los archivos de entorno están excluidos de Git.

```bash
# Valida el archivo completo sin modificar la base de datos:
npm run import:members -- private/phones.txt --prod
# Importa a producción en lotes de 250:
npm run import:members -- private/phones.txt --prod --apply
```

La importación normaliza y elimina duplicados, y es idempotente. No reactiva números revocados. Los lotes anteriores permanecen si un lote posterior falla; repetir la importación es seguro.

Para revocar o reactivar usa la función interna `members:setActive` con `{ "phone": "+…", "active": false }` o `true` mediante el CLI autenticado. La cuenta deja de publicarse en ambos casos; reactivarla exige que el miembro vuelva a elegir aparecer. No uses números personales en issues, commits o acciones de CI.

## Vincular X

No hacen falta una aplicación de X, API keys ni proveedor de SMS. El miembro escribe su `@usuario` (1–15 letras, números o guiones bajos), lo guarda y marca la casilla si quiere aparecer. Guardar o cambiar un usuario lo oculta hasta que vuelva a elegir publicar. Desvincularlo libera ese usuario para otro miembro.

Los teléfonos solo se procesan en el backend y la administración privada. El navegador nunca recibe la lista de teléfonos ni permite importarla. Todas las funciones de perfil derivan el miembro desde la sesión; nunca reciben un ID de miembro elegido por el cliente.

## Producción

Frontend: https://exponential-community.vercel.app

Backend: proyecto `andres-sanz/exponential-community`, producción `intent-raccoon-430` (EU West).

```bash
npx convex deploy --yes
npx @convex-dev/auth --prod --skip-git-check --web-server-url https://exponential-community.vercel.app
```

Vercel necesita `NEXT_PUBLIC_CONVEX_URL` apuntando al despliegue de producción. Las claves JWT de Convex Auth son distintas para desarrollo y producción. No reutilices las de otro proyecto.

La integración Git de Vercel despliega el frontend desde `main`. Los cambios del backend requieren `convex deploy`; para automatizarlos, configura un `CONVEX_DEPLOY_KEY` de producción en Vercel y el build command `npx convex deploy --cmd 'npm run build'`. No configures ese comando sin la clave.

## Verificación

Las pruebas con `convex-test` verifican acceso anónimo, teléfonos no autorizados y revocados, normalización e importación, privacidad del resultado, publicación opcional, validación del usuario de X y prevención de cuentas duplicadas. El acceso y la publicación también se comprueban en navegador con un miembro ficticio en desarrollo; producción conserva su lista vacía.

Fuentes de implementación: [Convex Auth / proveedores personalizados](https://labs.convex.dev/auth/api_reference/providers/ConvexCredentials).

## Diseño

El directorio adopta el estilo de [goexponential.org](https://www.goexponential.org/): fondo negro, Geist y Geist Mono, bordes finos y etiquetas verde, azul y violeta. El logo en `public/brand/exponential.svg` procede de `/logos/tef.svg` de esa web. Los contenidos y controles se adaptan al acceso por teléfono y a los perfiles de X.

## Perfiles de X pendientes de teléfonos

`importedXProfiles` guarda importaciones privadas con su archivo de origen y huella SHA-256. La columna «Compartido por» de un PDF describe a quien compartió el enlace; no establece la titularidad de la cuenta. Los nombres ilegibles y fechas ausentes se conservan como datos desconocidos.

La importación `xProfiles:importBatch` y la comprobación `xProfiles:auditBatch` son internas y requieren el CLI autenticado de Convex. El importador normaliza y deduplica usuarios de X, preserva los datos del primer origen y no crea miembros, concede acceso ni publica perfiles. Los archivos de importación se guardan en `private/`, fuera de Git.

Para asociar los teléfonos posteriores hace falta una correspondencia explícita `phone` / `xUsername`. Nunca se deduce por el nombre de quien compartió el enlace.

## Validación del teléfono y registro manual

La interfaz permite teléfonos nacionales con un país explícito; el servidor y los importadores exigen números internacionales. Se utiliza la metadata completa de `libphonenumber-js/max`, sin extracción de números incrustados en texto, letras, extensiones ni números imposibles. Los formatos con espacios, guiones y paréntesis se normalizan; un prefijo `00` se convierte en `+`. Al pegar un número internacional completo, el selector adopta su país y muestra el formato nacional.

Los 245 países y sus prefijos están en `lib/phone-countries.ts`; sus banderas son assets locales de `country-flag-icons` (MIT). Se regeneran con `node scripts/generate-phone-countries.mjs`, sin solicitudes a proveedores externos cuando el usuario usa el formulario.

La función interna `members:registerMember` recibe `phone`, `username` y una decisión explícita de publicación. Permite registrar manualmente un miembro, comprueba que X no pertenezca a otro registro y conserva la asociación de usuario existente. Solo es invocable por operadores con acceso a Convex. Los números reales deben guardarse en `private/`, nunca en código, pruebas, commits o descripciones de PR.

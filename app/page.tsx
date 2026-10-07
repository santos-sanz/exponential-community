"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import Link from "next/link";
import Image from "next/image";
import { Component, type ReactNode, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  LockKeyhole,
  LogOut,
  Search,
  ShieldCheck,
  Users,
  Link2,
  Minus,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { normalizePhone } from "@/lib/phone";
import type { CountryCode } from "libphonenumber-js/max";
import { ProfileCard } from "@/components/ProfileCard";
import {
  directoryKinds,
  normalizeProfile,
  type DirectoryKind,
} from "@/lib/profiles";
import { PhoneNumberField } from "@/components/PhoneNumberField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

function Header() {
  const { signOut } = useAuthActions();
  return (
    <header className="header">
      <Link
        className="brand"
        href="/"
        aria-label="Directorios de Exponential, inicio"
      >
        <Image
          src="/brand/exponential.svg"
          alt="Exponential"
          width={36}
          height={33}
          className="brand-logo"
          priority
        />
      </Link>
      <nav className="header-right" aria-label="Navegación principal">
        <a
          className="nav-link"
          href="https://www.goexponential.org/community"
          target="_blank"
          rel="noopener noreferrer"
        >
          Web de Exponential <ArrowUpRight size={14} />
        </a>
        <a
          className="nav-link"
          href="https://github.com/santos-sanz/exponential-community"
          target="_blank"
          rel="noopener noreferrer"
        >
          Código abierto <ArrowUpRight size={14} />
        </a>
        <Unauthenticated>
          <a className="nav-button" href="#acceso">
            Directorio
          </a>
        </Unauthenticated>
        <Authenticated>
          <Button
            variant="ghost"
            size="sm"
            className="nav-button"
            onClick={() => void signOut()}
          >
            <LogOut size={15} /> Salir
          </Button>
        </Authenticated>
      </nav>
    </header>
  );
}
function Login() {
  const { signIn } = useAuthActions();
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<CountryCode>("ES");
  const phoneRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    let normalized: string;
    try {
      normalized = normalizePhone(phone, country);
    } catch (e) {
      setError((e as Error).message);
      phoneRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const result = await signIn("phone", { phone: normalized });
      if (!result.signingIn)
        setError(
          "No hemos podido darte acceso. Comprueba tu número o consulta con la comunidad.",
        );
    } catch {
      setError(
        "No hemos podido darte acceso. Comprueba tu número o consulta con la comunidad.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="landing">
      <section className="intro">
        <p className="eyebrow">EXPONENTIAL · DIRECTORIOS</p>
        <h1>Los directorios de Exponential.</h1>
        <p className="intro-copy">
          Encuentra los perfiles de X, GitHub, LinkedIn y webs que los miembros
          han compartido.
        </p>
      </section>
      <section className="access-section" id="acceso">
        <Card className="access-card">
          <div className="access-intro">
            <div className="card-heading">
              <span className="section-tag tag-green">Acceso</span>
            </div>
            <h2>Estás entre los tuyos.</h2>
            <p className="card-copy">
              Introduce el teléfono con el que formas parte de Exponential
              Community para entrar al directorio.
            </p>
            <div className="privacy-note">
              <ShieldCheck size={18} />
              <p>
                Tu teléfono es privado.
                <br />
                Los directorios solo muestran enlaces publicados.
              </p>
            </div>
          </div>
          <form onSubmit={submit} noValidate>
            <label htmlFor="phone">Tu número de teléfono</label>
            <PhoneNumberField
              value={phone}
              country={country}
              disabled={busy}
              invalid={!!error}
              inputRef={phoneRef}
              onChange={(value) => {
                setPhone(value);
                setError("");
              }}
              onCountryChange={(country) => {
                setCountry(country);
                setError("");
              }}
            />
            <p id="phone-help" className="field-help">
              Elige tu país y escribe tu número. También puedes pegarlo con
              prefijo. Sin SMS.
            </p>
            <Button type="submit" disabled={busy} className="primary-button">
              {busy ? "Comprobando acceso…" : "Entrar al directorio"}
              <ArrowRight size={18} />
            </Button>
            {error && (
              <p id="phone-error" className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        </Card>
        <p className="under-card">
          Acceso exclusivo para teléfonos incluidos en la comunidad.
        </p>
      </section>
      <section className="how-it-works" aria-label="Cómo funciona">
        <div>
          <span className="section-tag tag-green">Acceso</span>
          <p>
            <strong>Entra con tu teléfono</strong>
            <br />
            Comprobamos que esté en la lista.
          </p>
        </div>
        <div>
          <span className="section-tag tag-blue">Directorio</span>
          <p>
            <strong>Explora los directorios</strong>
            <br />
            Cambia entre X, GitHub, LinkedIn y webs.
          </p>
        </div>
        <div>
          <span className="section-tag tag-purple">Tu perfil</span>
          <p>
            <strong>Comparte si quieres</strong>
            <br />
            Vincula tu X y elige si aparecer.
          </p>
        </div>
      </section>
    </main>
  );
}
class AccessBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <AccessUnavailable /> : this.props.children;
  }
}
function AccessUnavailable() {
  const { signOut } = useAuthActions();
  return (
    <main className="unavailable">
      <LockKeyhole size={30} />
      <h1>Tu acceso no está activo.</h1>
      <p>Consulta con la comunidad para comprobar tu número.</p>
      <Button onClick={() => void signOut()}>Volver al acceso</Button>
    </main>
  );
}
function Directory() {
  const [kind, setKind] = useState<DirectoryKind>("x");
  return (
    <main className="directory">
      <div className="directory-heading">
        <p className="eyebrow">ENLACES COMPARTIDOS POR LOS MIEMBROS</p>
        <h1>Directorios de Exponential.</h1>
        <p>Elige qué perfiles y enlaces quieres explorar.</p>
      </div>
      <a className="mobile-profile-shortcut" href="#mis-enlaces">
        Mis enlaces · añadir o editar
      </a>
      <div
        className="directory-tabs"
        role="tablist"
        aria-label="Elegir directorio"
        onKeyDown={(event) => {
          const index = directoryKinds.findIndex((item) => item.kind === kind);
          const next =
            event.key === "ArrowRight"
              ? (index + 1) % 4
              : event.key === "ArrowLeft"
                ? (index + 3) % 4
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? 3
                    : null;
          if (next !== null) {
            event.preventDefault();
            setKind(directoryKinds[next].kind);
            event.currentTarget
              .querySelectorAll<HTMLButtonElement>("[role=tab]")
              [next].focus();
          }
        }}
      >
        {directoryKinds.map((item) => (
          <button
            key={item.kind}
            role="tab"
            tabIndex={kind === item.kind ? 0 : -1}
            id={`tab-${item.kind}`}
            aria-selected={kind === item.kind}
            aria-controls="directory-panel"
            className={kind === item.kind ? "selected" : ""}
            onClick={() => setKind(item.kind)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div id="directory-panel" role="tabpanel" aria-labelledby={`tab-${kind}`}>
        <DirectoryPanel key={kind} kind={kind} />
      </div>
    </main>
  );
}
function DirectoryPanel({ kind }: { kind: DirectoryKind }) {
  const info = directoryKinds.find((item) => item.kind === kind)!;
  const viewer = useQuery(api.profiles.viewer, { kind });
  const { results, status, loadMore } = usePaginatedQuery(
    api.profiles.list,
    { kind },
    { initialNumItems: 24 },
  );
  const save = useMutation(api.profiles.save),
    publish = useMutation(api.profiles.publish),
    remove = useMutation(api.profiles.remove);
  const [value, setValue] = useState(""),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  let preview: ReturnType<typeof normalizeProfile> | null = null;
  try {
    preview = value.trim() ? normalizeProfile(kind, value) : null;
  } catch {
    /* Incomplete inputs have no card. */
  }
  const visible = results.filter((row) =>
    (row.label + row.url)
      .toLowerCase()
      .includes(search.toLowerCase().replace(/^@/, "")),
  );
  async function update(task: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      const data = (e as { data?: unknown }).data;
      setError(
        typeof data === "string"
          ? data
          : "No hemos podido guardar el cambio. Comprueba el enlace e inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="directory-layout">
      <section className="profiles">
        <div className="list-heading">
          <h2>
            <Users size={20} /> {info.label}
          </h2>
          <span className="list-count">ENLACES PUBLICADOS</span>
        </div>
        <div className="search-field">
          <Search size={18} />
          <Input
            aria-label={`Buscar en ${info.label}`}
            placeholder="Buscar entre los enlaces cargados"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {status === "LoadingFirstPage" ? (
          <p role="status">Cargando enlaces…</p>
        ) : visible.length ? (
          <div className="profile-grid">
            {visible.map((row, i) => (
              <ProfileCard
                key={`${row.url}-${i}`}
                kind={kind}
                value={row.value}
              />
            ))}
          </div>
        ) : (
          <Card className="empty-card">
            <span className="empty-icon">
              <Users size={28} />
            </span>
            <h3>
              {results.length
                ? "No hay coincidencias."
                : `Todavía no hay enlaces de ${info.label} compartidos.`}
            </h3>
            <p>Puedes añadir el tuyo y elegir si quieres que aparezca.</p>
          </Card>
        )}
        {status === "CanLoadMore" && (
          <Button
            variant="outline"
            className="load-more"
            onClick={() => loadMore(24)}
          >
            Cargar más enlaces
          </Button>
        )}
        {status === "LoadingMore" && <p role="status">Cargando más enlaces…</p>}
      </section>
      <aside id="mis-enlaces">
        <Card className="my-profile">
          <span className="section-tag tag-purple">
            {kind === "website" ? "Tu web" : `Tu ${info.label}`}
          </span>
          <h2>Comparte tu enlace.</h2>
          <p>Puedes consultar este directorio sin publicar tu perfil.</p>
          {!viewer ? (
            <p role="status">Cargando perfil…</p>
          ) : viewer.value ? (
            <>
              <ProfileCard kind={kind} value={viewer.value} />
              <label className="visibility">
                <input
                  type="checkbox"
                  checked={viewer.published}
                  disabled={busy}
                  onChange={(e) =>
                    void update(() =>
                      publish({ kind, published: e.target.checked }),
                    )
                  }
                />
                <span>
                  {kind === "website"
                    ? "Mostrar mi web a los miembros"
                    : `Mostrar mi perfil de ${info.label} a los miembros`}
                </span>
              </label>
              <p className="visibility-status">
                {viewer.published
                  ? "Tu enlace aparece en este directorio."
                  : "Tu enlace está guardado y oculto."}
              </p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void update(() => remove({ kind }))}
              >
                <Minus size={16} /> Eliminar enlace
              </Button>
            </>
          ) : (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (preview)
                    void update(() => save({ kind, value: preview!.value }));
                }}
              >
                <label className="x-label" htmlFor="profile-input">
                  {kind === "website"
                    ? "La URL de tu web"
                    : `Tu perfil de ${info.label}`}
                </label>
                <Input
                  id="profile-input"
                  placeholder={info.placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  maxLength={500}
                  required
                  autoComplete="off"
                />
                {preview && (
                  <ProfileCard kind={kind} value={preview.value} preview />
                )}
                <Button
                  type="submit"
                  className="primary-button"
                  disabled={busy || !preview}
                >
                  <Link2 size={17} />
                  {busy ? "Guardando…" : "Guardar enlace"}
                </Button>
              </form>
              <p className="field-help">
                Revisa la tarjeta antes de guardar. La publicación es opcional y
                se elige por separado en cada directorio.
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <p>
              Solo compartimos el enlace que publiques.
              <br />
              Nunca tu número de teléfono.
            </p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
export default function Home() {
  return (
    <div className="site-shell">
      <Header />
      <p className="directory-scope">
        Este sitio reúne directorios de perfiles y webs. No es la comunidad de
        Exponential.
      </p>
      <AuthLoading>
        <main className="unavailable" role="status">
          Conectando con el directorio…
        </main>
      </AuthLoading>
      <Unauthenticated>
        <Login />
      </Unauthenticated>
      <Authenticated>
        <AccessBoundary>
          <Directory />
        </AccessBoundary>
      </Authenticated>
      <footer className="footer">
        <a
          href="https://www.goexponential.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Web de Exponential
        </a>
        <span>Perfiles y webs compartidos por miembros.</span>
        <a
          href="https://github.com/santos-sanz/exponential-community"
          target="_blank"
          rel="noopener noreferrer"
        >
          Código abierto <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}

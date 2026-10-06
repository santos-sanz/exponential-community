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
  AtSign,
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
import { PhoneNumberField } from "@/components/PhoneNumberField";
import { normalizeXUsername } from "@/lib/x";
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
        aria-label="Directorio de X de Exponential, inicio"
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
        <p className="eyebrow">EXPONENTIAL · DIRECTORIO DE X</p>
        <h1>El directorio de X de Exponential.</h1>
        <p className="intro-copy">
          Encuentra las cuentas de X que los miembros de Exponential han
          compartido.
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
                El directorio solo muestra cuentas de X.
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
            <strong>Encuentra cuentas de X</strong>
            <br />
            Consulta las cuentas de X compartidas.
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
  const viewer = useQuery(api.members.viewer);
  const { results, status, loadMore } = usePaginatedQuery(
    api.members.directory,
    {},
    { initialNumItems: 24 },
  );
  const publish = useMutation(api.members.setPublished),
    unlink = useMutation(api.members.unlink),
    linkX = useMutation(api.members.linkX);
  const [username, setUsername] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const visible = results.filter((row) =>
    row.username.toLowerCase().includes(search.replace(/^@/, "").toLowerCase()),
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
          : "No hemos podido guardar el cambio. Comprueba el usuario e inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="directory">
      <div className="directory-heading">
        <p className="eyebrow">CUENTAS COMPARTIDAS POR LOS MIEMBROS</p>
        <h1>Directorio de X.</h1>
        <p>Encuentra a los miembros que han compartido su cuenta de X.</p>
      </div>
      <div className="directory-layout">
        <section className="profiles">
          <div className="list-heading">
            <h2>
              <Users size={20} /> Directorio
            </h2>
            <span className="list-count">SOLO CUENTAS DE X</span>
          </div>
          <div className="search-field">
            <Search size={18} />
            <Input
              aria-label="Buscar en las cuentas cargadas"
              placeholder="Buscar @usuario entre las cuentas cargadas"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {status === "LoadingFirstPage" ? (
            <p className="empty-text" role="status">
              Cargando cuentas…
            </p>
          ) : visible.length ? (
            <div className="profile-grid">
              {visible.map((row) => (
                <a
                  className="profile-card"
                  key={row.username}
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AtSign className="x-symbol" size={22} aria-hidden="true" />
                  <strong>@{row.username}</strong>
                  <ArrowUpRight size={18} />
                </a>
              ))}
            </div>
          ) : (
            <Card className="empty-card">
              <span className="empty-icon">
                <Users size={28} />
              </span>
              <h3>
                {results.length
                  ? "No hay coincidencias en esta página."
                  : "Las primeras conexiones están por llegar."}
              </h3>
              <p>
                {results.length
                  ? "Prueba otro usuario o carga más cuentas."
                  : "Cuando alguien comparta su cuenta de X, aparecerá aquí. Puedes ser el primero."}
              </p>
            </Card>
          )}
          {status === "CanLoadMore" && (
            <Button
              variant="outline"
              className="load-more"
              onClick={() => loadMore(24)}
            >
              Cargar más cuentas
            </Button>
          )}
          {status === "LoadingMore" && (
            <p role="status">Cargando más cuentas…</p>
          )}
        </section>
        <aside>
          <Card className="my-profile">
            <span className="section-tag tag-purple">Tu perfil</span>
            <h2>Haz que te encuentren.</h2>
            <p>Puedes explorar el directorio sin compartir tu cuenta.</p>
            {!viewer ? (
              <p role="status">Cargando perfil…</p>
            ) : viewer.username ? (
              <>
                <a
                  className="own-account"
                  href={`https://x.com/${viewer.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AtSign size={20} aria-hidden="true" /> @{viewer.username}
                  <ArrowUpRight size={16} />
                </a>
                <label className="visibility">
                  <input
                    type="checkbox"
                    checked={viewer.published}
                    disabled={busy}
                    onChange={(e) =>
                      void update(() =>
                        publish({ published: e.target.checked }),
                      )
                    }
                  />
                  <span>
                    Mostrar mi cuenta de X a los miembros de la comunidad
                  </span>
                </label>
                <p className="visibility-status">
                  {viewer.published
                    ? "Tu cuenta aparece en el directorio."
                    : "Tu cuenta está vinculada y oculta."}
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void update(() => unlink())}
                >
                  <Minus size={16} /> Desvincular cuenta
                </Button>
              </>
            ) : (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    let normalized: string;
                    try {
                      normalized = normalizeXUsername(username);
                    } catch (error) {
                      setError((error as Error).message);
                      return;
                    }
                    void update(() => linkX({ username: normalized }));
                  }}
                >
                  <label className="x-label" htmlFor="x-username">
                    Tu usuario de X
                  </label>
                  <Input
                    id="x-username"
                    placeholder="@tuusuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={16}
                    required
                    autoComplete="off"
                  />
                  <Button
                    type="submit"
                    className="primary-button"
                    disabled={busy || !username.trim()}
                  >
                    <Link2 size={17} />{" "}
                    {busy ? "Guardando…" : "Vincular mi cuenta de X"}
                  </Button>
                </form>
                <p className="field-help">
                  Escribe tu @usuario y después decide si quieres aparecer.
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
                Solo compartimos tu cuenta de X.
                <br />
                Nunca tu número de teléfono.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
export default function Home() {
  return (
    <div className="site-shell">
      <Header />
      <p className="directory-scope">
        Este sitio es únicamente el directorio de X. No es la comunidad de
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
        <span>Solo cuentas de X compartidas por miembros.</span>
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

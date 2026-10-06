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
import { Component, type ReactNode, useState } from "react";
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
import { normalizeXUsername } from "@/lib/x";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      e<span>ˣ</span>
    </span>
  );
}
function Header() {
  const { signOut } = useAuthActions();
  return (
    <header className="header">
      <Link
        className="brand"
        href="/"
        aria-label="Exponential Community, inicio"
      >
        <Mark />
        <span>
          exponential<span className="brand-sub">community</span>
        </span>
      </Link>
      <div className="header-right">
        <span className="member-label">
          <span className="dot" /> DIRECTORIO DE MIEMBROS
        </span>
        <Authenticated>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut size={15} />
            <span>Salir</span>
          </Button>
        </Authenticated>
      </div>
    </header>
  );
}
function Login() {
  const { signIn } = useAuthActions();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    let normalized: string;
    try {
      normalized = normalizePhone(phone);
    } catch (e) {
      setError((e as Error).message);
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
        <p className="eyebrow">
          <span className="line" /> LAS CONEXIONES EMPIEZAN AQUÍ
        </p>
        <h1>
          Las personas
          <br />
          detrás de las
          <br />
          <span className="accent">ideas.</span>
        </h1>
        <p className="intro-copy">
          La comunidad ya está en X.
          <br />
          Ahora es más fácil encontrarnos.
        </p>
        <div className="intro-footer">
          <span className="orbit-icon" aria-hidden="true">
            ↗
          </span>
          <p>
            Un punto de encuentro.
            <br />
            <strong>Muchas conversaciones por empezar.</strong>
          </p>
        </div>
      </section>
      <section className="access-section">
        <Card className="access-card">
          <div className="card-heading">
            <span className="icon-square">
              <LockKeyhole size={22} />
            </span>
            <span className="card-index">01 / ACCESO</span>
          </div>
          <h2>Estás entre los tuyos.</h2>
          <p className="card-copy">
            Introduce el teléfono con el que formas parte de Exponential
            Community para entrar al directorio.
          </p>
          <form onSubmit={submit}>
            <label htmlFor="phone">Tu número de teléfono</label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+34 612 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={40}
              aria-describedby="phone-help"
              className="phone-input"
            />
            <p id="phone-help" className="field-help">
              Incluye el prefijo de tu país. No se envía ningún SMS.
            </p>
            <Button type="submit" disabled={busy} className="primary-button">
              {busy ? "Comprobando acceso…" : "Entrar a la comunidad"}
              <ArrowRight size={18} />
            </Button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <p>
              Tu teléfono es privado.
              <br />
              El directorio solo muestra cuentas de X.
            </p>
          </div>
        </Card>
        <p className="under-card">
          Acceso exclusivo para teléfonos incluidos en la comunidad.
        </p>
      </section>
      <section className="how-it-works" aria-label="Cómo funciona">
        <div>
          <span>01</span>
          <p>
            <strong>Entra con tu teléfono</strong>
            <br />
            Comprobamos que esté en la lista.
          </p>
        </div>
        <div>
          <span>02</span>
          <p>
            <strong>Encuentra a tu comunidad</strong>
            <br />
            Consulta las cuentas de X compartidas.
          </p>
        </div>
        <div>
          <span>03</span>
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
        <p className="eyebrow">TU COMUNIDAD, MÁS CERCA</p>
        <h1>
          Una conexión.
          <br />
          <span className="accent">Infinitas posibilidades.</span>
        </h1>
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
              Cargando comunidad…
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
                  <span className="x-symbol" aria-hidden="true">
                    𝕏
                  </span>
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
            <span className="card-index">TU PERFIL</span>
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
                  <span>𝕏</span> @{viewer.username}
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
      <AuthLoading>
        <main className="unavailable" role="status">
          Conectando con la comunidad…
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
        <span>exponential community</span>
        <span>Las buenas ideas crecen cuando se conectan.</span>
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

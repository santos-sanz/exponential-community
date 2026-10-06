"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="unavailable">
      <h1>No hemos podido cargar la comunidad.</h1>
      <p>Comprueba tu conexión e inténtalo de nuevo.</p>
      <button onClick={reset}>Volver a intentar</button>
    </main>
  );
}

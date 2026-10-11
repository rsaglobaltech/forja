"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // En producción, aquí iría el servicio de errores (Sentry, OpenTelemetry…).
    console.error(error);
  }, [error]);

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Algo ha fallado</h1>
      <p className="text-sm text-gray-600">No se pudo completar la operación. ¿Está la API en marcha?</p>
      <button onClick={reset} className="text-sm text-brand-600 hover:underline">
        Reintentar
      </button>
    </section>
  );
}

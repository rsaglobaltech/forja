"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production, the error-reporting service (Sentry, OpenTelemetry…) goes here.
    console.error(error);
  }, [error]);

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-gray-600">The operation could not be completed. Is the API running?</p>
      <button onClick={reset} className="text-sm text-brand-600 hover:underline">
        Try again
      </button>
    </section>
  );
}

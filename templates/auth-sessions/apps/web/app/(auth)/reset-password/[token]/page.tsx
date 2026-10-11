"use client";

import { use, useActionState } from "react";
import { resetPasswordAction } from "../../../../src/app/actions/auth.actions.js";

const input =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const label = "mb-1 block text-sm font-medium text-text";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, formAction, pending] = useActionState(resetPasswordAction, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-sm rounded-md bg-surface p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-text">Elegí una contraseña nueva</h1>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="newPassword" className={label}>
              Contraseña nueva
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={input}
            />
          </div>
          {state.error && (
            <p className="text-sm text-red-600">
              {state.error} —{" "}
              <a href="/forgot-password" className="text-brand-600 hover:underline">
                Pedí un link nuevo
              </a>
              .
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </main>
  );
}

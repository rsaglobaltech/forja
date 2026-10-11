"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "../../../src/app/actions/auth.actions.js";

const input =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const label = "mb-1 block text-sm font-medium text-text";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, {});
  const submitted = state.ok === true;

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-sm rounded-md bg-surface p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-text">Recuperar contraseña</h1>
        {submitted ? (
          <p className="text-sm text-text">
            Si ese email existe, te mandamos un link para elegir una contraseña nueva.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className={label}>
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required className={input} />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-gray-600">
          <Link href="/login" className="text-brand-600 hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}

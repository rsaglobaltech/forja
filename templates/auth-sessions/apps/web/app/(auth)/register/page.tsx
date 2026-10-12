"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "../../../src/app/actions/auth.actions.js";

const input =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const label = "mb-1 block text-sm font-medium text-text";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-sm rounded-md bg-surface p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-text">Create account</h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className={label}>
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className={input} />
          </div>
          <div>
            <label htmlFor="password" className={label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={input}
            />
            <p className="mt-1 text-xs text-gray-500">At least 8 characters.</p>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

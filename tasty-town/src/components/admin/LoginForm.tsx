"use client";
import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="h-11 w-full rounded-lg border border-line px-3 text-sm" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="h-11 w-full rounded-lg border border-line px-3 text-sm" />
      </div>
      {state?.error && <p role="alert" className="text-sm font-medium text-[#c4301c]">{state.error}</p>}
      <button disabled={pending} className="h-11 w-full rounded-lg bg-ink text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

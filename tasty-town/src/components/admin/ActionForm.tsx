"use client";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin";

export function ActionForm({ action, children, className }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; children: ReactNode; className?: string }) {
  const [state, run] = useActionState(action, undefined);
  return (
    <form action={run} className={className}>
      {children}
      {state?.error && <p role="alert" className="text-sm font-medium text-[#c4301c]">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-medium text-[#167a35]">{state.ok}</p>}
    </form>
  );
}

export function SubmitButton({ children, className = "", confirm: msg }: { children: ReactNode; className?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} onClick={(e) => { if (msg && !window.confirm(msg)) e.preventDefault(); }}
      className={`min-h-10 rounded-lg px-4 text-sm font-semibold disabled:opacity-50 ${className || "bg-ink text-white"}`}>
      {pending ? "Working…" : children}
    </button>
  );
}

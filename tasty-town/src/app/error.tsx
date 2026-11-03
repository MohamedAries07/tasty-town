"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-black">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">Please try again.</p>
      <button onClick={reset} className="mt-6 rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white">Retry</button>
    </div>
  );
}

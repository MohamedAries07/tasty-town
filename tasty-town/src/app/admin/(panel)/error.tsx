"use client";
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="max-w-md space-y-3 rounded-xl border border-line bg-white p-6">
      <h1 className="text-lg font-black">Something went wrong</h1>
      <p className="text-sm text-muted">This page couldn’t load. Your data is safe. Try again, and if it keeps happening, check your connection.</p>
      <button onClick={reset} className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-white">Try again</button>
    </div>
  );
}

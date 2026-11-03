export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6" role="status" aria-label="Loading">
      <div className="h-8 w-40 animate-pulse rounded bg-line" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-line" />)}</div>
    </div>
  );
}

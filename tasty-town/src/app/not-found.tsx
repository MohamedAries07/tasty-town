import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-black">Page not found</h1>
      <Link href="/menu" className="mt-6 inline-block rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white">Back to menu</Link>
    </div>
  );
}

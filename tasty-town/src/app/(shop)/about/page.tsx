import type { Metadata } from "next";
import { getSettings, str } from "@/lib/queries";

export const metadata: Metadata = { title: "About" };
export const revalidate = 60;

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-3xl font-black tracking-tight">{str(s, "restaurant_name", "TASTY TOWN")}</h1>
      <p className="font-semibold">{str(s, "tagline")}</p>
      {str(s, "description") && <p className="text-sm leading-relaxed text-muted">{str(s, "description")}</p>}
      <p className="text-sm">{str(s, "address")}</p>
      <p className="text-sm">{str(s, "contact_phone")}</p>
    </div>
  );
}

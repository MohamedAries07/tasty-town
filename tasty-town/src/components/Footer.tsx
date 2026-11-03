import { MapPin, Phone } from "lucide-react";
import { str } from "@/lib/queries";
import { whatsappLink } from "@/lib/format";
import type { Settings } from "@/types";
import { InstallButton } from "./InstallButton";

export function Footer({ s }: { s: Settings }) {
  const address = str(s, "address");
  const phone = str(s, "contact_phone");
  const wa = str(s, "whatsapp_number");
  const maps = str(s, "maps_url");
  return (
    <footer className="mt-16 bg-ink text-white">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <p className="text-xl font-black">{str(s, "restaurant_name", "TASTY TOWN")}</p>
        <p className="text-sm text-white/70">{str(s, "tagline")}</p>
        {address && <p className="flex gap-2 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-lime" />{address}</p>}
        {phone && <p className="flex gap-2 text-sm"><Phone className="size-4 shrink-0 text-lime" /><a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a></p>}
        <div className="flex flex-wrap gap-3 pt-2 text-sm">
          {wa && <a className="rounded-lg bg-lime px-4 py-2 font-semibold text-ink" href={whatsappLink(wa)}>WhatsApp us</a>}
          {maps && <a className="rounded-lg border border-white/30 px-4 py-2" href={maps}>Open in Maps</a>}
        </div>
        <InstallButton />
        {str(s, "footer_text") && <p className="pt-4 text-xs text-white/50">{str(s, "footer_text")}</p>}
      </div>
    </footer>
  );
}

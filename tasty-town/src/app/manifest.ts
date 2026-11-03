import type { MetadataRoute } from "next";
import { getSettings, str } from "@/lib/queries";

export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  const name = str(s, "restaurant_name", "TASTY TOWN");
  return {
    name, short_name: name.length > 12 ? name.slice(0, 12) : name, description: str(s, "tagline", "Order food online"),
    id: "/", start_url: "/?source=pwa", scope: "/", display: "standalone", orientation: "portrait",
    background_color: "#FAFAF8", theme_color: "#101010", categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Menu", url: "/menu" }, { name: "Cart", url: "/cart" }],
  };
}

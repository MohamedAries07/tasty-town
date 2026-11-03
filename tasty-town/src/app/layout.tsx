import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { getSettings, str } from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const name = str(s, "restaurant_name", "TASTY TOWN");
  return {
    title: { default: str(s, "seo_title", `${name} — ${str(s, "tagline", "Order online")}`), template: `%s | ${name}` },
    description: str(s, "seo_description", str(s, "tagline")),
    applicationName: name,
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
    ...(publicImageUrl("restaurant-assets", str(s, "og_image_path")) ? { openGraph: { images: [publicImageUrl("restaurant-assets", str(s, "og_image_path"))!] } } : {}),
  };
}

export const viewport: Viewport = { themeColor: "#101010", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const accent = str(await getSettings(), "accent_color");
  return (
    <html lang="en" className={GeistSans.variable} style={/^#[0-9a-fA-F]{6}$/.test(accent) ? ({ "--color-lime": accent } as React.CSSProperties) : undefined}>
      <body className="font-sans antialiased">{children}<PwaRegister /></body>
    </html>
  );
}

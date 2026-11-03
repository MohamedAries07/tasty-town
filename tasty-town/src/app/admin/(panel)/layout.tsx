import Link from "next/link";
import { Image as ImageIcon, LayoutDashboard, LogOut, ReceiptText, ShoppingBasket, Tags, Percent, MessageSquareText, BarChart3, FileDown, Contact, Settings, Users, UserCircle } from "lucide-react";
import { hasRole, requireAdmin } from "@/lib/auth";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

const LINKS = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard, min: "staff" },
  { href: "/admin/orders", label: "Orders", Icon: ReceiptText, min: "staff" },
  { href: "/admin/products", label: "Products", Icon: ShoppingBasket, min: "manager" },
  { href: "/admin/categories", label: "Categories", Icon: Tags, min: "manager" },
  { href: "/admin/offers", label: "Offers", Icon: Percent, min: "manager" },
  { href: "/admin/reviews", label: "Reviews", Icon: MessageSquareText, min: "manager" },
  { href: "/admin/customers", label: "Customers", Icon: Contact, min: "manager" },
  { href: "/admin/analytics", label: "Analytics", Icon: BarChart3, min: "manager" },
  { href: "/admin/reports", label: "Reports", Icon: FileDown, min: "manager" },
  { href: "/admin/media", label: "Media", Icon: ImageIcon, min: "manager" },
  { href: "/admin/settings", label: "Settings", Icon: Settings, min: "super_admin" },
  { href: "/admin/staff", label: "Staff", Icon: Users, min: "super_admin" },
  { href: "/admin/account", label: "Account", Icon: UserCircle, min: "staff" },
] as const;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdmin();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-line bg-white md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-ink text-sm font-black text-lime">TT</span>
          <span className="font-black">Admin</span>
          <form action={signOut} className="ml-auto md:hidden">
            <button aria-label="Sign out" className="p-2"><LogOut className="size-5" /></button>
          </form>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {LINKS.filter((l) => hasRole(role, l.min)).map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 hidden px-4 text-xs text-muted md:block">
          <p className="truncate">{user.email}</p><p className="capitalize">{role.replace("_", " ")}</p>
          <form action={signOut}><button className="mt-2 flex items-center gap-1 font-semibold text-ink"><LogOut className="size-3.5" />Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0 p-4 md:p-6">{children}</div>
    </div>
  );
}

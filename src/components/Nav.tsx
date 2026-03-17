"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sales", label: "Sales" },
  { href: "/inventory", label: "Inventory" },
  { href: "/customers", label: "Customers" },
  { href: "/collection", label: "Collection" },
  { href: "/trading", label: "Trading" },
  { href: "/shows", label: "Card Shows" },
  { href: "/settings", label: "Settings" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 text-sm" aria-label="Main">
      {links.map(({ href, label }) => {
        const isActive =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : href === "/collection"
              ? pathname === "/collection" || pathname.startsWith("/collection/")
              : href === "/trading"
                ? pathname === "/trading" || pathname.startsWith("/trading/")
                : href === "/settings"
                  ? pathname === "/settings" || pathname.startsWith("/settings/")
                  : pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? "font-medium text-[var(--foreground)] border-b-2 border-[var(--accent)] pb-0.5 -mb-0.5 transition-colors"
                : "text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

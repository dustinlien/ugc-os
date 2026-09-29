"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ShellBrand = {
  id: string;
  name: string;
  color: string;
};

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2 py-1.5 text-sm",
        active ? "bg-muted font-medium" : "text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function AppShell({
  brand,
  children,
}: {
  brand?: ShellBrand | null;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const dashboardActive = path === "/";
  const brandsActive = path === "/brands" || path.startsWith("/brands/");
  const settingsActive = path === "/settings";

  const links = (
    <>
      <NavLink href="/" active={dashboardActive}>
        Dashboard
      </NavLink>
      <NavLink href="/brands" active={brandsActive && !brand}>
        Brands
      </NavLink>
      {brand ? (
        <Link
          href={`/brands/${brand.id}`}
          className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-sm font-medium"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: brand.color }}
          />
          <span className="truncate">{brand.name}</span>
        </Link>
      ) : null}
    </>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar/80 md:flex md:flex-col md:justify-between md:px-3 md:py-4">
        <div className="flex flex-col gap-4">
          <Link href="/" className="px-2 text-lg font-semibold tracking-tight">
            UGC OS
          </Link>
          <nav className="flex flex-col gap-1">{links}</nav>
        </div>
        <NavLink href="/settings" active={settingsActive}>
          Settings
        </NavLink>
      </aside>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">
        {children}
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link
          href="/"
          className={cn(
            "flex min-h-12 flex-1 items-center justify-center text-sm",
            dashboardActive ? "font-medium" : "text-muted-foreground",
          )}
        >
          Dashboard
        </Link>
        <Link
          href="/brands"
          className={cn(
            "flex min-h-12 flex-1 items-center justify-center text-sm",
            brandsActive ? "font-medium" : "text-muted-foreground",
          )}
        >
          Brands
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex min-h-12 flex-1 items-center justify-center text-sm",
            settingsActive ? "font-medium" : "text-muted-foreground",
          )}
        >
          Settings
        </Link>
      </nav>
    </div>
  );
}

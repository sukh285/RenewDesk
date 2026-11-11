"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  ClipboardList,
  Plug,
  Menu,
  LogOut,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/reviews", label: "Reviews", icon: ClipboardList },
];

interface User {
  name?: string | null;
  email: string;
}

interface NavigationProps {
  user: User;
  mcpUrl: string;
  connectClaudeDialog: React.ReactNode;
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
        <span className="text-primary-foreground font-bold text-sm leading-none">
          R
        </span>
      </div>
      <span className="text-base font-semibold tracking-tight text-foreground">
        RenewDesk
      </span>
    </div>
  );
}

function NavLinks({
  pathname,
  onClick,
}: {
  pathname: string;
  onClick?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  user,
  connectClaudeDialog,
  onLinkClick,
}: {
  user: User;
  connectClaudeDialog: React.ReactNode;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      toast.error("Could not sign out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <Link href="/" onClick={onLinkClick}>
          <Logo />
        </Link>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks pathname={pathname} onClick={onLinkClick} />
      </div>

      {/* Bottom section */}
      <div className="border-t border-border px-3 py-4 space-y-2">
        {/* Connect Claude */}
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          {connectClaudeDialog}
        </div>

        {/* User badge */}
        <div className="px-3 py-2 rounded-lg bg-muted">
          <p className="text-xs font-medium text-foreground truncate">
            {user.name ?? user.email}
          </p>
          {user.name && (
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          )}
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {loggingOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </div>
  );
}

export function Navigation({
  user,
  mcpUrl,
  connectClaudeDialog,
}: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar - fixed left */}
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 w-60 bg-card border-r border-border z-30"
        aria-label="Sidebar"
      >
        <SidebarContent
          user={user}
          connectClaudeDialog={connectClaudeDialog}
        />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-card border-b border-border flex items-center justify-between px-4 h-14">
        <Link href="/">
          <Logo />
        </Link>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SidebarContent
              user={user}
              connectClaudeDialog={connectClaudeDialog}
              onLinkClick={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </header>

      {/* Mobile top bar spacer */}
      <div className="md:hidden h-14 flex-shrink-0" aria-hidden="true" />
    </>
  );
}

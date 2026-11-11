"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  ClipboardCheck,
  Sparkles,
  LogOut,
  Menu,
  Building2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/reviews", label: "Renewal Reviews", icon: ClipboardCheck },
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

function BrandHeader() {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <div className="h-7 w-7 rounded-md bg-emerald-800 flex items-center justify-center flex-shrink-0 text-white font-semibold text-xs tracking-tight shadow-xs">
        RD
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold tracking-tight text-zinc-900 leading-none">
          RenewDesk
        </span>
        <span className="text-[11px] text-zinc-600 mt-0.5 leading-none">
          Renewal Decisions
        </span>
      </div>
    </div>
  );
}

function WorkspaceBadge() {
  return (
    <div className="mx-2 mb-3 px-2.5 py-2 rounded-md bg-stone-100 border border-stone-200/80 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="h-3.5 w-3.5 text-zinc-700 flex-shrink-0" />
        <span className="font-medium text-zinc-800 truncate">Acme Growth Studio</span>
      </div>
      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 rounded border border-emerald-200 flex-shrink-0">
        Demo
      </span>
    </div>
  );
}

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-0.5 px-2" aria-label="Main Navigation">
      <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
        Workspace
      </div>
      {mainNavItems.map(({ href, label, icon: Icon, badge }) => {
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(href + "/");

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors",
              isActive
                ? "bg-white text-emerald-800 shadow-xs border border-stone-200/80 font-semibold"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-stone-100/70"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-emerald-700" : "text-zinc-600 group-hover:text-zinc-700"
                )}
              />
              <span className="truncate">{label}</span>
            </div>
            {badge && (
              <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-stone-200 text-zinc-700">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  user,
  connectClaudeDialog,
  onNavigate,
}: {
  user: User;
  connectClaudeDialog: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      toast.error("Could not sign out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#fbfbfa] border-r border-stone-200 text-zinc-900 select-none">
      {/* Brand Header */}
      <div className="p-3 border-b border-stone-200/80 bg-white/70">
        <BrandHeader />
      </div>

      {/* Workspace indicator */}
      <div className="pt-3">
        <WorkspaceBadge />
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto">
        <NavList pathname={pathname} onNavigate={onNavigate} />

        <div className="mt-4 px-2">
          <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
            Integrations
          </div>
          <div className="p-2 rounded-md bg-white border border-stone-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-800">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Remote MCP Server
              </span>
              <span className="text-[10px] font-mono text-zinc-600">Live</span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-normal">
              Connect external Claude or MCP clients to query and write subscription reviews.
            </p>
            <div className="pt-1">
              {connectClaudeDialog}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Account */}
      <div className="p-3 border-t border-stone-200 bg-white/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-zinc-900 truncate">
              {user.name ?? "Finance Ops"}
            </p>
            <p className="text-[11px] text-zinc-600 truncate font-mono">
              {user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={loggingOut}
            className="h-7 w-7 text-zinc-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
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

  return (
    <>
      {/* Desktop Sidebar (Fixed left) */}
      <aside className="hidden md:flex flex-col w-60 fixed inset-y-0 left-0 z-30">
        <SidebarBody
          user={user}
          connectClaudeDialog={connectClaudeDialog}
        />
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 inset-x-0 z-30 h-13 bg-[#fbfbfa]/95 backdrop-blur-xs border-b border-stone-200 flex items-center justify-between px-3">
        <BrandHeader />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 border-stone-200 text-xs font-medium gap-1.5"
              aria-label="Toggle menu"
            >
              <Menu className="h-4 w-4" />
              <span>Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarBody
              user={user}
              connectClaudeDialog={connectClaudeDialog}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}

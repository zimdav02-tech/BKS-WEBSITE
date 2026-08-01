import { useState, type ReactNode } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, Plus, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/useAdmin";
import { useProfile, useUnreadCount } from "@/hooks/usePortal";
import { mobileNav, portalNav } from "./nav";
import { quickActions } from "./quick-actions";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = useUnreadCount();

  return (
    <nav aria-label="Portal sections" className="space-y-1">
      {portalNav.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-gradient-gold text-primary-foreground shadow-gold"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden />
            <span className="truncate">{item.title}</span>
            {item.title === "Notifications" && unread > 0 && (
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-gradient-gold font-display text-sm font-bold text-primary-foreground">
        BKS
      </span>
      <span className="font-display text-sm font-bold leading-tight">
        Customer
        <br />
        Portal
      </span>
    </Link>
  );
}

function QuickActionSheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-display">Quick actions</SheetTitle>
        </SheetHeader>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {quickActions.map((a) => (
            <Link
              key={a.title}
              to={a.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-medium shadow-soft transition hover:-translate-y-0.5 hover:shadow-gold"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                <a.icon className="size-4" aria-hidden />
              </span>
              {a.title}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PortalShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isStaff } = useMyRoles();
  const { data: profile } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const initials = (profile?.full_name || profile?.email || "B")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border bg-card/80 backdrop-blur-xl lg:flex">
        <div className="px-6 py-6">
          <BrandMark />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <NavList />
        </div>
        <div className="border-t border-border p-4">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="glass-panel sticky top-0 z-30">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="px-6 py-6">
                    <SheetTitle className="sr-only">Portal navigation</SheetTitle>
                    <BrandMark />
                  </SheetHeader>
                  <div className="max-h-[70vh] overflow-y-auto px-4 pb-8">
                    <NavList onNavigate={() => setMobileOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
              <span className="font-display text-sm font-semibold lg:hidden">BKS Portal</span>
            </div>

            <div className="flex items-center gap-2">
              {isStaff && (
                <Button asChild variant="goldOutline" size="sm" className="hidden sm:inline-flex">
                  <Link to="/admin">
                    <ShieldCheck /> Admin
                  </Link>
                </Button>
              )}
              <QuickActionSheet>
                <Button variant="gold" size="sm" className="hidden sm:inline-flex">
                  <Plus /> New booking
                </Button>
              </QuickActionSheet>
              <Link to="/portal/profile" aria-label="Profile">
                <Avatar className="size-9 border border-border">
                  <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[90rem] px-4 pb-28 pt-8 sm:px-6 lg:pb-16 lg:px-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="glass-panel fixed inset-x-0 bottom-0 z-40 flex items-center justify-around px-2 py-2 lg:hidden"
      >
        {mobileNav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("size-5", active && "text-gold")} aria-hidden />
              {item.title.replace("My ", "")}
            </Link>
          );
        })}
      </nav>

      {/* Floating quick action */}
      <div className="fixed bottom-20 right-5 z-40 lg:hidden">
        <QuickActionSheet>
          <Button
            variant="gold"
            size="icon"
            aria-label="Quick actions"
            className="size-14 rounded-full shadow-gold"
          >
            <Plus className="size-6" />
          </Button>
        </QuickActionSheet>
      </div>
    </div>
  );
}

export { X };
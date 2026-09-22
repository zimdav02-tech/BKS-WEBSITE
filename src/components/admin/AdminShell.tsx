import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronLeft, ChevronRight, LogOut, Menu, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/useAdmin";
import { adminNav } from "./admin-config";
import { cn } from "@/lib/utils";

const INACTIVITY_LIMIT = 15 * 60 * 1000;

function AdminNavigation({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const sections = useMemo(() => [...new Set(adminNav.map((item) => item.section))], []);
  return (
    <nav aria-label="Admin modules" className="space-y-5">
      {sections.map((section) => (
        <div key={section}>
          {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{section}</p>}
          <div className="space-y-1">
            {adminNav.filter((item) => item.section === section).map((item) => {
              const active = item.to === "/admin" ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as never}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all",
                    collapsed && "justify-center px-0",
                    active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { loading, isStaff, isSuperAdmin, roles } = useMyRoles();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = useCallback(async (inactive = false) => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    if (inactive) toast.info("Signed out for security", { description: "Your session ended after 15 minutes of inactivity." });
    navigate({ to: "/auth", replace: true });
  }, [navigate, queryClient]);

  useEffect(() => {
    if (!loading && !isStaff) {
      toast.error("Administrator access required");
      navigate({ to: "/portal", replace: true });
    }
  }, [isStaff, loading, navigate]);

  useEffect(() => {
    if (!isStaff) return;
    let timer = window.setTimeout(() => void signOut(true), INACTIVITY_LIMIT);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void signOut(true), INACTIVITY_LIMIT);
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [isStaff, signOut]);

  if (loading || !isStaff) {
    return <div className="grid min-h-screen place-items-center bg-muted/40"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const roleLabel = isSuperAdmin ? "Super Administrator" : (roles?.[0] ?? "staff").replaceAll("_", " ");

  return (
    <div className="min-h-screen bg-muted/40">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 lg:flex", collapsed ? "w-20" : "w-72")}>
        <div className={cn("flex h-20 items-center border-b border-sidebar-border", collapsed ? "justify-center" : "px-5")}>
          <Link to="/admin" className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary font-display text-sm font-extrabold text-primary-foreground">BKS</span>
            {!collapsed && <span className="font-display text-sm font-bold leading-tight">Operations<br />Command Centre</span>}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5"><AdminNavigation collapsed={collapsed} /></div>
        <div className="border-t border-sidebar-border p-3">
          <Button variant="ghost" size="sm" className={cn("w-full", collapsed ? "px-0" : "justify-start")} onClick={() => void signOut()} title="Sign out">
            <LogOut /> {!collapsed && "Sign out"}
          </Button>
        </div>
      </aside>

      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-20" : "lg:pl-72")}>
        <header className="glass-panel sticky top-0 z-30 border-b">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="border-b p-5 text-left"><SheetTitle>BKS Command Centre</SheetTitle></SheetHeader>
                <div className="h-[calc(100vh-5rem)] overflow-y-auto p-3"><AdminNavigation collapsed={false} onNavigate={() => setMobileOpen(false)} /></div>
              </SheetContent>
            </Sheet>
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-10 bg-background pl-9" placeholder="Search bookings, customers, vehicles…" aria-label="Global search" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Notifications" asChild><Link to="/admin/$module" params={{ module: "notifications" }}><Bell /></Link></Button>
              <div className="hidden text-right sm:block"><p className="text-xs font-semibold capitalize">{roleLabel}</p><p className="text-[10px] text-muted-foreground">Secure session</p></div>
              <Avatar className="size-9 border"><AvatarFallback className="bg-secondary text-secondary-foreground"><ShieldCheck className="size-4" /></AvatarFallback></Avatar>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
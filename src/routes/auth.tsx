import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { destinationForAccess, loadMyStaffAccess } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | BKS Customer Portal" },
      {
        name: "description",
        content:
          "Sign in or create a BKS Investment Group account to book services, upload payments and track every booking in real time.",
      },
      { property: "og:title", content: "BKS Customer Portal" },
      { property: "og:description", content: "Book, pay and track your BKS services in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || !active) return;
      const access = await loadMyStaffAccess();
      if (active) navigate({ to: destinationForAccess(access) });
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setLoading(false);
      toast.error("Could not sign in", { description: error.message });
      return;
    }
    toast.success("Welcome back");
    const access = await loadMyStaffAccess();
    setLoading(false);
    navigate({ to: destinationForAccess(access) });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: String(form.get("name") ?? "") },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Could not create account", { description: error.message });
      return;
    }
    toast.success("Account created", { description: "You can now sign in." });
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    const access = await loadMyStaffAccess();
    navigate({ to: destinationForAccess(access) });
  }

  async function handleGoogle(): Promise<void> {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    const access = await loadMyStaffAccess();
    navigate({ to: destinationForAccess(access) });
  }

  async function handleResetPassword(): Promise<void> {
    if (!resetEmail) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Reset link could not be sent", { description: error.message });
      return;
    }
    toast.success("Password reset link sent", { description: "Check your email to continue." });
    setShowReset(false);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-ink p-12 text-ink-foreground lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-gold font-display text-sm font-bold text-primary-foreground">
            BKS
          </span>
          <span className="font-display font-bold">BKS Investment Group</span>
        </Link>
        <div>
          <h1 className="font-display text-4xl font-bold">
            Driven By <span className="text-gradient-gold">Excellence</span>
          </h1>
          <p className="mt-4 max-w-sm text-ink-foreground/70">
            One account for bookings, payments, invoices, support chat and live status across every BKS
            service.
          </p>
        </div>
        <p className="text-xs text-ink-foreground/40">© {new Date().getFullYear()} BKS Investment Group</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground lg:hidden">
            ← Back to site
          </Link>
          <h2 className="mt-6 font-display text-3xl font-bold">Customer portal</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your bookings, or create a new account.
          </p>

          <Tabs defaultValue="signin" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="mt-6 grid gap-4" onSubmit={handleSignIn}>
                <div className="grid gap-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between"><Label htmlFor="si-password">Password</Label><Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setShowReset((value) => !value)}>Forgot password?</Button></div>
                  <div className="relative"><Input
                    id="si-password"
                    name="password"
                    type={showSignInPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowSignInPassword((value) => !value)} aria-label={showSignInPassword ? "Hide password" : "Show password"}>{showSignInPassword ? <EyeOff /> : <Eye />}</Button></div>
                </div>
                {showReset && <div className="grid gap-2 rounded-lg border bg-muted/40 p-3"><Label htmlFor="reset-email">Account email</Label><Input id="reset-email" type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="you@example.com" /><Button type="button" variant="outline" disabled={loading || !resetEmail} onClick={() => void handleResetPassword()}>Send reset link</Button></div>}
                <Button type="submit" variant="gold" size="lg" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form className="mt-6 grid gap-4" onSubmit={handleSignUp}>
                <div className="grid gap-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" name="name" required autoComplete="name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="su-password">Password</Label>
                  <div className="relative"><Input
                    id="su-password"
                    name="password"
                    type={showSignUpPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="pr-10"
                  /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowSignUpPassword((value) => !value)} aria-label={showSignUpPassword ? "Hide password" : "Show password"}>{showSignUpPassword ? <EyeOff /> : <Eye />}</Button></div>
                </div>
                <Button type="submit" variant="gold" size="lg" disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" size="lg" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
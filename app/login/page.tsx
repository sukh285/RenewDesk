import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/layout/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <span className="text-primary-foreground font-bold text-lg leading-none">
                R
              </span>
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              RenewDesk
            </span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Track renewals. Own decisions. Ship on time.
          </p>
        </div>

        {/* Login card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <div className="mb-5">
            <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Enter your credentials to access your workspace.
            </p>
          </div>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Need access? Contact your workspace admin.
        </p>
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/layout/LoginForm";
import { ShieldCheck } from "lucide-react";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-4 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-6 gap-2 text-center">
          <div className="h-9 w-9 rounded-lg bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shadow-xs">
            RD
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            RenewDesk
          </h1>
          <p className="text-xs text-zinc-500">
            Subscription renewal decision tracking for small teams.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-stone-200 rounded-xl shadow-xs p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Sign in to Workspace</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter demo credentials below to access the decision dashboard.
            </p>
          </div>

          <LoginForm />
        </div>

        {/* Security / Demo note */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Server-side encrypted session • Fictional demo environment</span>
        </div>
      </div>
    </main>
  );
}

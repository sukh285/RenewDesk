import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { Navigation } from "@/components/layout/Navigation";
import { ConnectClaudeDialog } from "@/components/layout/ConnectClaudeDialog";

const mcpUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/mcp`;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Navigation handles both sidebar and mobile top bar */}
      <Navigation
        user={{ email: session.username, name: session.username.split("@")[0] }}
        mcpUrl={mcpUrl}
        connectClaudeDialog={<ConnectClaudeDialog mcpUrl={mcpUrl} />}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-60">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

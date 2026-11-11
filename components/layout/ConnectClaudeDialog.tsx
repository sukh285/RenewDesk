"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Laptop,
  ArrowRight,
  User,
  Bot,
  Database,
  LayoutDashboard,
  CheckCircle2,
  HelpCircle,
  X,
  Sparkles,
  BookOpen,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConnectClaudeDialogProps {
  mcpUrl: string;
}

export function ConnectClaudeDialog({ mcpUrl }: ConnectClaudeDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState<"walkthrough" | "setup">("walkthrough");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedInspector, setCopiedInspector] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  async function copyToClipboard(text: string, type: "url" | "snippet" | "inspector" | "prompt") {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);

      if (type === "url") {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else if (type === "snippet") {
        setCopiedSnippet(true);
        setTimeout(() => setCopiedSnippet(false), 2000);
      } else if (type === "inspector") {
        setCopiedInspector(true);
        setTimeout(() => setCopiedInspector(false), 2000);
      } else {
        setCopiedPrompt(text);
        setTimeout(() => setCopiedPrompt(null), 2000);
      }

      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy automatically. Please select and copy manually.");
    }
  }

  const desktopConfigJson = JSON.stringify(
    {
      mcpServers: {
        renewdesk: {
          command: "npx",
          args: ["-y", "mcp-remote", mcpUrl],
        },
      },
    },
    null,
    2
  );

  const inspectorCommand = `npx @modelcontextprotocol/inspector ${mcpUrl}`;

  const samplePrompts = [
    "What subscriptions are renewing in the next 30 days in RenewDesk?",
    "Add a new subscription: Loom Pro, INR 2200/month, renews 2026-12-05, owned by Priya Sharma.",
    "Update the Figma review decision to 'need_info' with rationale 'Waiting on Q1 hiring confirmation'.",
    "What is the current status and rationale for our Loom Pro renewal in RenewDesk?",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs font-medium justify-center h-8 bg-white border-stone-200 hover:bg-stone-50 text-zinc-800 transition-colors"
        >
          Connect Claude / MCP
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white border-stone-200 shadow-xl rounded-xl">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-stone-100 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <span>Model Context Protocol (MCP) Integration</span>
              </DialogTitle>
              <p className="text-xs text-zinc-500 mt-0.5">
                RenewDesk connects external AI clients directly to financial records without embedding AI runtime models inside the application.
              </p>
            </div>
            <span className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
              Streamable HTTP
            </span>
          </div>

          {/* Navigation View Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg border border-stone-200 text-xs w-full sm:w-auto self-start mt-1">
            <button
              type="button"
              onClick={() => setActiveView("walkthrough")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeView === "walkthrough"
                  ? "bg-white text-emerald-900 shadow-xs border border-stone-200 font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-700" />
              <span>How It Works (Walkthrough)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("setup")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeView === "setup"
                  ? "bg-white text-emerald-900 shadow-xs border border-stone-200 font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Settings className="h-3.5 w-3.5 text-zinc-600" />
              <span>Setup & Configuration</span>
            </button>
          </div>
        </DialogHeader>

        {/* VIEW 1: PRESENTATION STYLE WALKTHROUGH */}
        {activeView === "walkthrough" && (
          <div className="py-2 space-y-4">
            {/* Explanatory Walkthrough Notice */}
            <div className="p-2.5 rounded-md bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold">Explanatory Architectural Walkthrough</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                Demonstrates data flow and responsibilities. Not a live execution trace.
              </span>
            </div>

            {/* Example Context Banner */}
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                <span>Concrete Example: Adding and Evaluating "Loom Pro"</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Follow this 5-step journey to see how natural language in Claude translates into durable database records, renewal workflows, and human-verified outcomes.
              </p>
            </div>

            {/* 5 Step Walkthrough Cards */}
            <div className="space-y-3 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-stone-200">
              {/* Step 1 */}
              <div className="relative pl-10">
                <div className="absolute left-2 top-2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
                  1
                </div>
                <div className="p-3.5 rounded-lg border border-stone-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-600" />
                      <span>User Asks in Claude</span>
                    </h4>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-100 text-zinc-600">
                      User Action
                    </span>
                  </div>
                  <div className="p-2 rounded bg-stone-50 border border-stone-200/70 font-mono text-[11px] text-zinc-800">
                    "Add a new subscription: Loom Pro for INR 2,200 per month, renews 2026-12-05, owned by Priya Sharma."
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    <strong className="text-zinc-800">Claude's Reasoning:</strong> Claude parses natural language, extracts vendor identity, recognizes INR currency, and identifies the renewal date and owner.
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Customer Value: Zero manual data entry forms. Operators and founders record subscriptions directly from emails, chat, or Slack invoices.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative pl-10">
                <div className="absolute left-2 top-2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
                  2
                </div>
                <div className="p-3.5 rounded-lg border border-stone-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Claude Selects MCP Tool</span>
                    </h4>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Claude MCP Call
                    </span>
                  </div>
                  <div className="p-2 rounded bg-stone-50 border border-stone-200/70 font-mono text-[11px] text-zinc-800">
                    save_subscriptions({"{"} vendor: "Loom Pro", amount_paise: 220000, billing_cycle: "monthly", next_renewal: "2026-12-05", owner: "Priya Sharma" {"}"})
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    <strong className="text-zinc-800">Protocol Handshake:</strong> Claude calls our hosted endpoint over Streamable HTTP. It matches tool schemas without knowing our internal database structure.
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Customer Value: Standardized protocol. Works seamlessly across Claude Desktop, Claude Web, or any MCP-compatible AI client.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative pl-10">
                <div className="absolute left-2 top-2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
                  3
                </div>
                <div className="p-3.5 rounded-lg border border-stone-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-zinc-700" />
                      <span>RenewDesk Validates & Persists</span>
                    </h4>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-100 text-zinc-700">
                      Backend Responsibility
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    RenewDesk validates the payload with Zod schemas, stores the amount in paise (220,000 paise = ₹2,200), writes to Supabase Postgres, and auto-schedules an actionable review due exactly 7 days prior in Asia/Kolkata timezone (2026-11-28).
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Customer Value: Enforces strict business logic and data hygiene. No AI hallucinations can corrupt database integrity or financial math.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative pl-10">
                <div className="absolute left-2 top-2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
                  4
                </div>
                <div className="p-3.5 rounded-lg border border-stone-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                      <LayoutDashboard className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Dashboard Reflects Result</span>
                    </h4>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-100 text-zinc-700">
                      Application UI
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Opening RenewDesk shows Loom Pro immediately in the 30-Day Renewal Spend metric, in the Subscriptions catalog, and in the "To Review" workflow stage on the Reviews board.
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Customer Value: Complete transparency. Non-technical executives see real-time financial commitments without logging into external AI tools.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="relative pl-10">
                <div className="absolute left-2 top-2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
                  5
                </div>
                <div className="p-3.5 rounded-lg border border-stone-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Human Edits Become Readable by Claude</span>
                    </h4>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Human in the Loop
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Priya reviews Loom Pro in RenewDesk, marks the decision as "Cancel", and notes: <em>"Migrating team to Slack native video clips"</em>. When Claude is later asked <em>"What is the status of Loom Pro?"</em>, Claude invokes <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">list_reviews</code> and cites Priya's rationale verbatim.
                  </p>
                  <p className="text-[11px] text-red-800 font-medium bg-red-50/70 p-2 rounded border border-red-200/80">
                    Strict Boundary: A Cancel decision never terminates a vendor contract automatically. An authorized human must explicitly complete cancellation with Loom and confirm it in RenewDesk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: SETUP GUIDES & CONFIG */}
        {activeView === "setup" && (
          <div className="py-2 space-y-4">
            {/* Live Endpoint Bar */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider text-[11px]">
                Live Hosted MCP Endpoint
              </label>
              <div className="flex items-center gap-2 p-2 rounded-md bg-stone-50 border border-stone-200">
                <code className="text-xs font-mono text-zinc-900 flex-1 truncate select-all">
                  {mcpUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(mcpUrl, "url")}
                  className="h-7 px-2.5 text-xs font-medium bg-white shrink-0 border-stone-200 text-zinc-700 hover:bg-stone-50"
                >
                  {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">{copiedUrl ? "Copied" : "Copy URL"}</span>
                </Button>
              </div>
            </div>

            {/* Client Setup Tabs */}
            <Tabs defaultValue="desktop" className="w-full">
              <TabsList className="grid grid-cols-3 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
                <TabsTrigger value="desktop" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                  Claude Desktop (Free)
                </TabsTrigger>
                <TabsTrigger value="web" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                  Claude.ai Web
                </TabsTrigger>
                <TabsTrigger value="inspector" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                  MCP Inspector (Zero-Cost)
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Claude Desktop */}
              <TabsContent value="desktop" className="mt-3 space-y-3 text-xs text-zinc-600">
                <div className="p-3 rounded-md bg-stone-50 border border-stone-200/80 space-y-2">
                  <p className="font-medium text-zinc-900">
                    Setup for Claude Desktop (Free tier supported, no Claude Pro required):
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-600">
                    <li>Download and install the free Claude Desktop application.</li>
                    <li>
                      Open your configuration file:
                      <span className="font-mono text-[11px] bg-stone-200/60 px-1 py-0.5 rounded ml-1 block sm:inline mt-1 sm:mt-0">
                        %APPDATA%\Claude\claude_desktop_config.json
                      </span>
                    </li>
                    <li>Paste the configuration snippet below and restart Claude Desktop.</li>
                  </ol>
                </div>

                <div className="relative">
                  <pre className="p-3 rounded-md bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                    {desktopConfigJson}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyToClipboard(desktopConfigJson, "snippet")}
                    className="absolute top-2 right-2 h-6 px-2 text-[11px] bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border-zinc-700"
                  >
                    {copiedSnippet ? <Check className="h-3 w-3 text-emerald-400 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedSnippet ? "Copied" : "Copy Config"}
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 2: Claude Web */}
              <TabsContent value="web" className="mt-3 space-y-2 text-xs text-zinc-600">
                <div className="p-3 rounded-md bg-stone-50 border border-stone-200/80 space-y-2">
                  <p className="font-medium text-zinc-900">Claude.ai Web Setup (Pro / Team):</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-zinc-600">
                    <li>Open Claude.ai &gt; Settings &gt; Connectors / Integrations.</li>
                    <li>Click Add custom integration (or Add MCP Server).</li>
                    <li>Paste the live endpoint URL shown above.</li>
                    <li>Name the integration: <span className="font-semibold text-zinc-800">RenewDesk</span></li>
                    <li>Claude will discover all 4 tools automatically.</li>
                  </ol>
                </div>
              </TabsContent>

              {/* Tab 3: Official MCP Inspector */}
              <TabsContent value="inspector" className="mt-3 space-y-2 text-xs text-zinc-600">
                <div className="p-3 rounded-md bg-stone-50 border border-stone-200/80 space-y-2">
                  <p className="font-medium text-zinc-900">
                    Zero-Cost Visual Testing via Official MCP Inspector:
                  </p>
                  <p>
                    Run the following command in your terminal to open the interactive graphical inspector in your browser:
                  </p>
                  <div className="relative">
                    <pre className="p-2.5 bg-zinc-900 rounded font-mono text-[11px] text-zinc-100 overflow-x-auto">
                      {inspectorCommand}
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(inspectorCommand, "inspector")}
                      className="absolute top-1.5 right-1.5 h-6 px-2 text-[11px] bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border-zinc-700"
                    >
                      {copiedInspector ? <Check className="h-3 w-3 text-emerald-400 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedInspector ? "Copied" : "Copy Command"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Inspect schemas, test tool discovery, and execute live calls without any Anthropic tokens.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Example Prompts */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider text-[11px]">
                Ready-to-Use Example Prompts
              </label>
              <div className="space-y-1.5">
                {samplePrompts.map((prompt, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-200/70 text-xs text-zinc-800 gap-2"
                  >
                    <span className="truncate font-mono text-[11px]">{prompt}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(prompt, "prompt")}
                      className="h-6 px-2 text-[11px] text-zinc-600 hover:text-zinc-900 shrink-0"
                    >
                      {copiedPrompt === prompt ? (
                        <Check className="h-3 w-3 text-emerald-600 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedPrompt === prompt ? "Copied" : "Copy"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety Notice */}
            <div className="p-2.5 rounded-md bg-amber-50/60 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-800">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
              <span>
                Shared Demo Workspace: This public MCP endpoint interacts with fictional demo subscriptions. Personal or financial card data is never accepted or stored.
              </span>
            </div>
          </div>
        )}

        {/* Footer Close Button */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-8 text-xs px-3 border-stone-200 text-zinc-700 hover:bg-stone-50"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
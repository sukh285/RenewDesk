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
  Layers,
  Presentation,
  KeyRound,
  FileText,
  Clock,
  Code2,
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
  const [activeTab, setActiveTab] = useState<"overview" | "walkthrough" | "connect" | "tools">("overview");
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

  const declaredTools = [
    {
      name: "list_subscriptions",
      desc: "Returns subscriptions with current review state, renewal date, and owner.",
      params: "filterDays (optional number), owner (optional string), search (optional string)",
    },
    {
      name: "save_subscriptions",
      desc: "Creates or updates a SaaS subscription. Automatically schedules a review due 7 days prior.",
      params: "vendor (string), amount_paise (integer), billing_cycle ('monthly' | 'annual'), next_renewal ('YYYY-MM-DD'), owner (optional string), context (optional string)",
    },
    {
      name: "list_reviews",
      desc: "Queries renewal reviews filtered by due window, decision state, or action status.",
      params: "windowDays (optional number), decision ('undecided' | 'keep' | 'cancel' | 'need_info'), actionStatus ('open' | 'completed')",
    },
    {
      name: "save_reviews",
      desc: "Updates decision verdict, rationale, assigned owner, and checklist items. Cannot complete vendor cancellation.",
      params: "review_id (string), decision ('undecided' | 'keep' | 'cancel' | 'need_info'), owner (optional string), due_date (optional string), rationale (optional string), checklist (optional array)",
    },
  ];

  const samplePrompts = [
    {
      label: "Upcoming Renewals Query",
      prompt: "What subscriptions are renewing in the next 30 days in RenewDesk?",
      tool: "list_subscriptions",
    },
    {
      label: "Add New Subscription",
      prompt: "Add a new subscription: Loom Pro, INR 2200/month, renews 2026-12-05, owned by Priya Sharma.",
      tool: "save_subscriptions",
    },
    {
      label: "Update Decision with Context",
      prompt: "Update the Figma review decision to 'need_info' with rationale 'Waiting on Q1 hiring confirmation'.",
      tool: "save_reviews",
    },
    {
      label: "Read Live Review Rationale",
      prompt: "What is the current status and rationale for our Loom Pro renewal in RenewDesk?",
      tool: "list_reviews",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs font-medium justify-center h-8 bg-white border-stone-200 hover:bg-stone-50 text-zinc-800 transition-colors flex items-center gap-2 shadow-2xs"
        >
          <BookOpen className="h-3.5 w-3.5 text-emerald-800" />
          <span>MCP Guidebook</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] max-w-5xl h-[88vh] max-h-[850px] flex flex-col p-0 overflow-hidden bg-white border border-stone-200 shadow-2xl rounded-2xl">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/70 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                MCP Guidebook & Architecture
              </span>
              <span className="hidden sm:inline text-xs text-zinc-400">•</span>
              <span className="hidden sm:inline text-xs text-zinc-500 font-mono">Streamable HTTP (2024-11-05)</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 mt-1">
              RenewDesk: Project Presentation, Architecture & MCP Guide
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-stone-200 text-xs font-mono text-zinc-600">
              <span className="truncate max-w-[200px] select-all">{mcpUrl}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(mcpUrl, "url")}
                className="text-zinc-500 hover:text-zinc-900"
                title="Copy MCP URL"
              >
                {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-zinc-600 hover:text-zinc-900 border border-stone-200 bg-white"
              >
                Close
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* 4 Distinct Presentation Tabs */}
        <div className="px-6 pt-3 border-b border-stone-200 bg-white shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === "overview"
                  ? "bg-emerald-800 text-white shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-stone-100"
              }`}
            >
              <Presentation className="h-4 w-4" />
              <span>1. Project Overview & Specs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("walkthrough")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === "walkthrough"
                  ? "bg-emerald-800 text-white shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-stone-100"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>2. How MCP Works (5-Step Walkthrough)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("connect")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === "connect"
                  ? "bg-emerald-800 text-white shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-stone-100"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>3. Connect Claude (Desktop, Web, Inspector)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tools")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === "tools"
                  ? "bg-emerald-800 text-white shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-stone-100"
              }`}
            >
              <Code2 className="h-4 w-4" />
              <span>4. MCP Tools & Live Prompts</span>
            </button>
          </div>
        </div>

        {/* Scrollable Presentation Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PROJECT OVERVIEW & SPECS */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="p-5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                    Executive Summary: What is RenewDesk?
                  </h3>
                  <span className="text-[11px] font-mono font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    B2B SaaS Renewal Control
                  </span>
                </div>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  RenewDesk helps small teams (5 to 25 people) make subscription decisions before auto-billing triggers. Knowing a renewal date is insufficient: someone needs to own the decision, record whether to keep or cancel, and confirm that necessary actions were completed with the vendor.
                </p>
              </div>

              {/* 3 Core Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                  <div className="h-7 w-7 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900">An Assigned Owner</h4>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Every subscription approaching renewal has a named team member accountable for evaluating team usage, seat allocation, and budget.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                  <div className="h-7 w-7 rounded-md bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900">An Explicit Decision</h4>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Four distinct states: Undecided, Keep, Cancel, and Need Information. Reviews are organized on a Jira-inspired 3-stage board.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                  <div className="h-7 w-7 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900">A Tracked Outcome</h4>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    A Cancel decision never means the SaaS vendor is cancelled. Vendor cancellation requires explicit human confirmation before closure.
                  </p>
                </div>
              </div>

              {/* Architectural Guardrails */}
              <div className="p-5 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Technical Architecture & Invariants
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-mono uppercase text-zinc-500">No Embedded AI</span>
                    <p className="font-semibold text-zinc-800 mt-1">Zero Model API Keys</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Claude calls RenewDesk via MCP; app never calls an LLM internally.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-mono uppercase text-zinc-500">Currency Precision</span>
                    <p className="font-semibold text-zinc-800 mt-1">Integer Paise (INR Only)</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Stored as integer paise (1 INR = 100 paise), rendered in ₹ tabular figures.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-mono uppercase text-zinc-500">Timezone Guarantee</span>
                    <p className="font-semibold text-zinc-800 mt-1">Asia/Kolkata (UTC+5:30)</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">All renewal windows and 7-day review triggers calculate in Indian Standard Time.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-[10px] font-mono uppercase text-zinc-500">Remote Protocol</span>
                    <p className="font-semibold text-zinc-800 mt-1">Streamable HTTP</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Compliant with MCP specification 2024-11-05 via Next.js App Router handler.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HOW MCP WORKS (5-STEP WALKTHROUGH) */}
          {activeTab === "walkthrough" && (
            <div className="space-y-5">
              {/* Disclaimer Badge */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold">Explanatory Architectural Walkthrough</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                  Concrete demonstration of data flow. Not a simulated execution trace.
                </span>
              </div>

              {/* Concrete Example Banner */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-900">
                    Concrete Workflow Example: Evaluating "Loom Pro"
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                    Watch how natural conversation in Claude converts into verified PostgreSQL data, review triggers, and human-confirmed decisions.
                  </p>
                </div>
              </div>

              {/* 5 Step Visual Flow */}
              <div className="space-y-4 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-stone-200">
                {/* Step 1 */}
                <div className="relative pl-12">
                  <div className="absolute left-2.5 top-3 -translate-x-1/2 h-6 w-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    1
                  </div>
                  <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-zinc-500" />
                        <span>User Asks in Claude</span>
                      </h5>
                      <span className="text-[10px] font-mono uppercase bg-stone-100 text-zinc-600 px-2 py-0.5 rounded">
                        Natural Language Input
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 font-mono text-xs text-zinc-800">
                      "Add a new subscription: Loom Pro for INR 2,200 per month. The next renewal date is 2026-12-05, and the owner is Priya Sharma."
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="p-2 rounded bg-stone-50 text-zinc-600">
                        <strong className="text-zinc-800">Claude's Reasoning:</strong> Parses unstructured text, identifies SaaS vendor, formats ISO renewal date, and normalizes INR currency.
                      </div>
                      <div className="p-2 rounded bg-emerald-50/50 text-emerald-900">
                        <strong className="text-emerald-950">Customer Value:</strong> Zero manual data entry forms. Record subscriptions instantly from invoices or chat conversations.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative pl-12">
                  <div className="absolute left-2.5 top-3 -translate-x-1/2 h-6 w-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    2
                  </div>
                  <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                        <Bot className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Claude Selects MCP Tool</span>
                      </h5>
                      <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        Remote HTTP Dispatch
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto">
                      POST /api/mcp {"->"} callTool: save_subscriptions({"{"} vendor: "Loom Pro", amount_paise: 220000, billing_cycle: "monthly", next_renewal: "2026-12-05", owner: "Priya Sharma" {"}"})
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      Claude inspects the server's registered tools and selects <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-zinc-800">save_subscriptions</code> with structured parameters.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative pl-12">
                  <div className="absolute left-2.5 top-3 -translate-x-1/2 h-6 w-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    3
                  </div>
                  <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-zinc-600" />
                        <span>RenewDesk Validates & Persists</span>
                      </h5>
                      <span className="text-[10px] font-mono uppercase bg-stone-100 text-zinc-700 px-2 py-0.5 rounded">
                        Backend Persistence
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      RenewDesk verifies parameters with Zod, validates INR paise math (`220,000 paise = ₹2,200`), stores the subscription in PostgreSQL, and automatically creates a renewal review due exactly 7 days prior in Asia/Kolkata (`2026-11-28`).
                    </p>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Customer Value: Absolute data integrity. No AI hallucinations can corrupt database schemas or alter financial values.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative pl-12">
                  <div className="absolute left-2.5 top-3 -translate-x-1/2 h-6 w-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    4
                  </div>
                  <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                        <LayoutDashboard className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Dashboard Reflects Result</span>
                      </h5>
                      <span className="text-[10px] font-mono uppercase bg-stone-100 text-zinc-700 px-2 py-0.5 rounded">
                        Live Application UI
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Opening RenewDesk immediately shows Loom Pro in the 30-Day Renewal Spend total (`₹2,200`), lists it in the Subscriptions catalog, and places the review card into the "To Review" column on the Reviews board.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="relative pl-12">
                  <div className="absolute left-2.5 top-3 -translate-x-1/2 h-6 w-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    5
                  </div>
                  <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Human Edits Become Readable by Claude</span>
                      </h5>
                      <span className="text-[10px] font-mono uppercase bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                        Human Verification Loop
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Priya evaluates Loom Pro in RenewDesk, sets the verdict to "Cancel", and enters: <em>"Migrating team to Slack native video clips. Will not renew."</em> When Claude is subsequently asked: <em>"What is the status of Loom Pro?"</em>, Claude calls <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">list_reviews</code> and cites Priya's rationale verbatim.
                    </p>
                    <div className="p-2.5 rounded bg-red-50/70 border border-red-200 text-[11px] text-red-900 leading-relaxed">
                      <strong>Human Safety Boundary:</strong> A Cancel verdict in RenewDesk does not cancel the contract with Loom. Only an explicit human confirmation in the UI confirms completed vendor cancellation.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONNECT CLAUDE (SETUP GUIDES) */}
          {activeTab === "connect" && (
            <div className="space-y-6">
              {/* Live Endpoint Box */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Live Hosted MCP Endpoint (Streamable HTTP)
                </label>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-stone-200">
                  <code className="text-xs font-mono text-zinc-900 flex-1 truncate select-all">
                    {mcpUrl}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(mcpUrl, "url")}
                    className="h-7 px-3 text-xs font-medium bg-white shrink-0 border-stone-200 text-zinc-700 hover:bg-stone-50"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="ml-1.5">{copiedUrl ? "Copied" : "Copy URL"}</span>
                  </Button>
                </div>
              </div>

              {/* Client Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Option 1: Claude Desktop (Free) */}
                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-900">Claude Desktop (Free)</h4>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        No Pro Required
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Claude Desktop for Windows and Mac natively connects to our endpoint using the free tier.
                    </p>
                    <ol className="list-decimal list-inside text-[11px] text-zinc-600 space-y-1">
                      <li>Open config file: <code className="text-[10px] bg-stone-100 p-0.5 rounded">%APPDATA%\Claude\claude_desktop_config.json</code></li>
                      <li>Paste the snippet below.</li>
                      <li>Restart Claude Desktop.</li>
                    </ol>
                  </div>

                  <div className="relative pt-2">
                    <pre className="p-2.5 rounded bg-zinc-900 text-zinc-100 font-mono text-[10px] overflow-x-auto leading-relaxed max-h-32">
                      {desktopConfigJson}
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(desktopConfigJson, "snippet")}
                      className="mt-2 w-full h-7 text-[11px] bg-stone-100 hover:bg-stone-200 text-zinc-800 border border-stone-300"
                    >
                      {copiedSnippet ? <Check className="h-3 w-3 text-emerald-600 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedSnippet ? "Copied Config" : "Copy Config Snippet"}
                    </Button>
                  </div>
                </div>

                {/* Option 2: Claude.ai Web */}
                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-900">Claude.ai Web</h4>
                      <span className="text-[10px] font-semibold text-zinc-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                        Pro / Team
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Connect via the native browser UI if you have Claude Pro or an enterprise team account.
                    </p>
                    <ol className="list-decimal list-inside text-[11px] text-zinc-600 space-y-1.5">
                      <li>Open Claude.ai &gt; Settings &gt; Connectors.</li>
                      <li>Click "Add custom integration".</li>
                      <li>Paste the MCP URL above.</li>
                      <li>Name the integration: <strong>RenewDesk</strong></li>
                      <li>Claude will discover all 4 tools.</li>
                    </ol>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(mcpUrl, "url")}
                    className="w-full h-7 text-[11px] border-stone-300 text-zinc-700 hover:bg-stone-50"
                  >
                    Copy Endpoint URL
                  </Button>
                </div>

                {/* Option 3: Official MCP Inspector */}
                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-900">MCP Inspector (CLI)</h4>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Zero-Cost Web GUI
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Anthropic's official open-source tool for testing any MCP server interactively in your browser with zero logins.
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      Run this single terminal command:
                    </p>
                  </div>

                  <div className="relative pt-2">
                    <pre className="p-2.5 rounded bg-zinc-900 text-zinc-100 font-mono text-[10px] overflow-x-auto select-all">
                      {inspectorCommand}
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(inspectorCommand, "inspector")}
                      className="mt-2 w-full h-7 text-[11px] bg-stone-100 hover:bg-stone-200 text-zinc-800 border border-stone-300"
                    >
                      {copiedInspector ? <Check className="h-3 w-3 text-emerald-600 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedInspector ? "Copied Command" : "Copy Command"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MCP TOOLS & LIVE PROMPTS */}
          {activeTab === "tools" && (
            <div className="space-y-6">
              {/* 4 Declared Tools List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  4 Declared MCP Tools on /api/mcp
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {declaredTools.map((t) => (
                    <div
                      key={t.name}
                      className="p-3.5 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-bold font-mono text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {t.name}
                        </code>
                        <span className="text-[10px] font-mono text-zinc-500">Zod Validated</span>
                      </div>
                      <p className="text-xs text-zinc-700 leading-normal">{t.desc}</p>
                      <div className="text-[11px] font-mono text-zinc-500 pt-1 border-t border-stone-100">
                        <span className="font-semibold text-zinc-600">Params:</span> {t.params}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ready-to-Use Copyable Prompts */}
              <div className="space-y-3 pt-2 border-t border-stone-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  Ready-to-Use Test Prompts for Evaluators
                </h4>
                <div className="space-y-2">
                  {samplePrompts.map((p, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900">{p.label}</span>
                          <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 rounded border border-stone-200 text-zinc-500">
                            Invokes {p.tool}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-zinc-700 truncate select-all">
                          "{p.prompt}"
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(p.prompt, "prompt")}
                        className="h-7 px-3 text-xs font-medium border-stone-200 bg-white text-zinc-700 hover:bg-stone-50 shrink-0 self-end sm:self-auto"
                      >
                        {copiedPrompt === p.prompt ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {copiedPrompt === p.prompt ? "Copied" : "Copy Prompt"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer Bar */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50/70 shrink-0 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px]">RenewDesk Production • Supabase Postgres Live</span>
          </div>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-4 text-xs font-medium bg-white border-stone-200 text-zinc-700 hover:bg-stone-50"
            >
              Done
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
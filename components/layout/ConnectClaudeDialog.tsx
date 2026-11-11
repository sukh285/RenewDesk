"use client";

import { useState } from "react";
import { Copy, Check, Terminal, ExternalLink, ShieldAlert, Cpu, Laptop } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConnectClaudeDialogProps {
  mcpUrl: string;
}

export function ConnectClaudeDialog({ mcpUrl }: ConnectClaudeDialogProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  async function copyToClipboard(text: string, type: "url" | "snippet" | "prompt") {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "url") {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else if (type === "snippet") {
        setCopiedSnippet(true);
        setTimeout(() => setCopiedSnippet(false), 2000);
      } else {
        setCopiedPrompt(text);
        setTimeout(() => setCopiedPrompt(null), 2000);
      }
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy. Please select and copy manually.");
    }
  }

  const desktopConfigJson = JSON.stringify(
    {
      mcpServers: {
        renewdesk: {
          url: mcpUrl,
        },
      },
    },
    null,
    2
  );

  const samplePrompts = [
    "What subscriptions are renewing in the next 30 days in RenewDesk?",
    "Add a new subscription: Linear Pro, INR 1200/month, renews 2026-11-28, owned by Rohit Mehra.",
    "Update the Figma review decision to 'need_info' with rationale 'Waiting on Q1 hiring confirmation'.",
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs font-medium justify-center h-8 bg-white border-stone-200 hover:bg-stone-50 text-zinc-800"
        >
          Connect Claude / MCP
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-6 bg-white border-stone-200">
        <DialogHeader className="pb-3 border-b border-stone-100">
          <DialogTitle className="text-base font-semibold text-zinc-900 flex items-center justify-between">
            <span>Connect to RenewDesk via MCP</span>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Streamable HTTP
            </span>
          </DialogTitle>
          <p className="text-xs text-zinc-600 mt-1">
            RenewDesk exposes a standard remote Model Context Protocol endpoint. Claude and external agents query and write subscription records directly to our database.
          </p>
        </DialogHeader>

        {/* Live Endpoint Section */}
        <div className="mt-3 space-y-1.5">
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
              className="h-7 px-2.5 text-xs font-medium bg-white shrink-0 border-stone-200 text-zinc-700"
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="ml-1.5">{copiedUrl ? "Copied" : "Copy URL"}</span>
            </Button>
          </div>
        </div>

        {/* Client Options Tabs */}
        <div className="mt-4">
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

            {/* Tab 1: Claude Desktop (Free) */}
            <TabsContent value="desktop" className="mt-3 space-y-3 text-xs text-zinc-600">
              <div className="p-3 rounded-md bg-stone-50 border border-stone-200/80 space-y-2">
                <p className="font-medium text-zinc-900">
                  Setup for Claude Desktop (No Claude Pro required):
                </p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-600">
                  <li>Download and install the free Claude Desktop application.</li>
                  <li>
                    Open your configuration file at:
                    <span className="font-mono text-[11px] bg-stone-200/60 px-1 py-0.5 rounded ml-1">
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
                <p className="font-medium text-zinc-900">Claude.ai Web Setup:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-600">
                  <li>Open Claude.ai &gt; Settings &gt; Developer / Connectors.</li>
                  <li>Click Add custom integration (or Add MCP Server).</li>
                  <li>Paste the live endpoint URL shown above.</li>
                  <li>Name the integration: <span className="font-semibold text-zinc-800">RenewDesk</span></li>
                  <li>Claude will automatically discover all four tools.</li>
                </ol>
              </div>
            </TabsContent>

            {/* Tab 3: Official MCP Inspector */}
            <TabsContent value="inspector" className="mt-3 space-y-2 text-xs text-zinc-600">
              <div className="p-3 rounded-md bg-stone-50 border border-stone-200/80 space-y-2">
                <p className="font-medium text-zinc-900">
                  Zero-cost visual testing via Official MCP Inspector:
                </p>
                <p>
                  Run the following single command in any local terminal to open the interactive graphical inspector in your browser:
                </p>
                <div className="p-2 bg-zinc-900 rounded font-mono text-[11px] text-zinc-100 select-all">
                  npx @modelcontextprotocol/inspector {mcpUrl}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Provides a live graphical interface to test tool discovery and view real schema responses.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Copyable Prompts */}
        <div className="mt-4 pt-3 border-t border-stone-100 space-y-2">
          <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider text-[11px]">
            Ready-to-Use Example Prompts
          </label>
          <div className="space-y-1.5">
            {samplePrompts.map((prompt, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-200/70 text-xs text-zinc-800"
              >
                <span className="truncate pr-2 font-mono text-[11px]">{prompt}</span>
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

        {/* Disclaimer / Notice */}
        <div className="mt-3 p-2.5 rounded-md bg-amber-50/60 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <span>
            Shared Demo Workspace: This public MCP endpoint interacts with fictional demo subscriptions. Personal or financial card data is never accepted or stored.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

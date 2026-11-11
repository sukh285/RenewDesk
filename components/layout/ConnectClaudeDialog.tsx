"use client";

import { useState } from "react";
import { Copy, Check, Plug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConnectClaudeDialogProps {
  mcpUrl: string;
}

const examplePrompts = [
  "Which subscriptions are due for renewal in the next 30 days?",
  "Show me all subscriptions with an undecided review status.",
  "What is the total annual spend on active subscriptions?",
  "List reviews where no owner has been assigned.",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Please copy the URL manually.");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy URL"}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

export function ConnectClaudeDialog({ mcpUrl }: ConnectClaudeDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-2 text-sm font-medium text-muted-foreground hover:text-foreground justify-start flex-1"
        >
          Connect Claude
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" />
            Connect Claude to RenewDesk
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <p className="text-sm text-muted-foreground">
            Connect RenewDesk to Claude via the Model Context Protocol (MCP) to
            query your subscription and review data directly from Claude.ai.
          </p>

          {/* Steps */}
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                1
              </span>
              <div className="text-sm">
                <p className="font-medium text-foreground">Open Claude Settings</p>
                <p className="text-muted-foreground mt-0.5">
                  Go to{" "}
                  <a
                    href="https://claude.ai/settings/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    claude.ai/settings/integrations
                  </a>{" "}
                  and click{" "}
                  <strong className="text-foreground">Add custom integration</strong>.
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                2
              </span>
              <div className="text-sm flex-1 min-w-0">
                <p className="font-medium text-foreground">Enter the MCP URL</p>
                <p className="text-muted-foreground mt-0.5 mb-2">
                  Paste this URL into the integration URL field:
                </p>
                <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 border border-border">
                  <code className="text-xs text-foreground font-mono flex-1 min-w-0 break-all">
                    {mcpUrl}
                  </code>
                  <CopyButton text={mcpUrl} />
                </div>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                3
              </span>
              <div className="text-sm">
                <p className="font-medium text-foreground">Name the integration</p>
                <p className="text-muted-foreground mt-0.5">
                  Set the name to{" "}
                  <strong className="text-foreground">RenewDesk</strong> and save.
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                4
              </span>
              <div className="text-sm">
                <p className="font-medium text-foreground">Test the connection</p>
                <p className="text-muted-foreground mt-0.5">
                  Start a new Claude conversation and try one of the prompts below.
                </p>
              </div>
            </li>
          </ol>

          {/* Example prompts */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Example prompts</p>
            <ul className="space-y-1.5">
              {examplePrompts.map((prompt) => (
                <li
                  key={prompt}
                  className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2 border border-border"
                >
                  {prompt}
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 text-xs text-amber-800">
            This demo MCP endpoint contains shared fictional data only. No
            personal data is stored.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// MCP Route Handler - Streamable HTTP endpoint
// This is the actual MCP server that Claude connects to
// Path: /api/mcp
//
// Uses WebStandardStreamableHTTPServerTransport which works with
// Next.js App Router route handlers natively (web standard Request/Response).
//
// IMPORTANT: This is a stateless endpoint (no sessionIdGenerator) which
// is correct for Vercel serverless deployments. Each request is handled
// independently. Claude's MCP connector works with stateless servers.

import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";

// This endpoint is public (no session auth) but serves only fictional demo data.
// No real user data is exposed through the demo MCP endpoint.
// This matches the assignment requirement: simple public demo workspace.

export async function GET(req: NextRequest) {
  return handleMcp(req);
}

export async function POST(req: NextRequest) {
  return handleMcp(req);
}

export async function DELETE(req: NextRequest) {
  return handleMcp(req);
}

async function handleMcp(req: NextRequest): Promise<Response> {
  try {
    const server: McpServer = createMcpServer();

    // Stateless transport: no sessionIdGenerator means no persistent sessions.
    // This is correct for serverless/edge deployments.
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: false, // Use SSE streaming
    });

    // Connect server to transport
    await server.connect(transport);

    // Handle the request and get a response
    const response = await transport.handleRequest(req);

    // Add CORS headers for Claude connector
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id"
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err) {
    console.error("[MCP] Handler error:", err);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
      "Access-Control-Max-Age": "86400",
    },
  });
}


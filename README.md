# RenewDesk

> Subscription renewal decision control center for small teams.
> Prototype submission for the Volopay Founder's Office, Product and Growth role.
> Author: Sukhmeet Singh Lamba

[![Live Application](https://img.shields.io/badge/Live%20App-renewdesk--phi.vercel.app-059669?style=flat-square)](https://renewdesk-phi.vercel.app)
[![MCP Server](https://img.shields.io/badge/MCP%20Endpoint-Streamable%20HTTP-2563eb?style=flat-square)](https://renewdesk-phi.vercel.app/api/mcp)
[![Audit Status](https://img.shields.io/badge/Audit-32%2F32%20Passing-emerald?style=flat-square)](docs/BUILD_TIMELINE.md)

---

## 1. Quick Links & Evaluator Access

| Resource | Value / URL |
|---|---|
| **Live Web Application** | [https://renewdesk-phi.vercel.app](https://renewdesk-phi.vercel.app) |
| **Hosted Streamable HTTP MCP Endpoint** | [https://renewdesk-phi.vercel.app/api/mcp](https://renewdesk-phi.vercel.app/api/mcp) |
| **Demo Email** | `demo@renewdesk.app` |
| **Demo Password** | `RenewDesk2026!` |
| **Demo Workspace** | Acme Growth Studio |
| **Architecture & Implementation PDF** | [docs/ARCHITECTURE_AND_IMPLEMENTATION_NOTES.pdf](docs/ARCHITECTURE_AND_IMPLEMENTATION_NOTES.pdf) |
| **Chronological Build Timeline** | [docs/BUILD_TIMELINE.md](docs/BUILD_TIMELINE.md) |
| **Detailed Product Summary** | [docs/PRODUCT_SUMMARY.md](docs/PRODUCT_SUMMARY.md) |

---

## 2. Product Promise & Core Problem

**Target User:** A founder or operations manager at a small startup or agency (5 to 25 people) tracking paid software across disparate spreadsheets and invoices.

**The Problem:** Knowing a renewal date is not enough. Without a dedicated workflow, subscriptions auto-renew without verification, leaving companies paying for zombie licenses or tools nobody uses. Someone needs to own the decision, record whether to keep or cancel, and confirm that cancellation actions were completed with the vendor before money leaves the bank.

**Core Workflow:** Every renewal has:
1. **An Assigned Owner:** Accountable for assessing seat utilization and utility.
2. **An Explicit Decision:** Four distinct states (`Undecided`, `Keep`, `Cancel`, `Need Information`) tracked across a Jira-inspired 3-stage board (`To Review`, `In Progress`, `Awaiting Action`).
3. **A Tracked Outcome:** Human confirmation is strictly required. Setting a "Cancel" verdict never auto-terminates a vendor contract; an authorized human must confirm completing cancellation in the vendor's billing portal.

---

## 3. Architecture & External AI Model Boundary

RenewDesk strictly separates natural language reasoning from application state and business invariants.

```
+-------------------------------------------------------------------------+
| EXTERNAL REASONING CLIENT                                               |
| Claude Desktop (Free) / Claude Web (Pro)                                 |
|                                                                         |
| - Understands natural language requests                                 |
| - Extracts vendor, INR pricing, renewal dates, and owners               |
| - Selects matching Model Context Protocol (MCP) tools                   |
+------------------------------------+------------------------------------+
                                     |
                                     | Streamable HTTP (JSON-RPC)
                                     v
+-------------------------------------------------------------------------+
| RENEWDESK APPLICATION RUNTIME (Next.js 16 on Vercel)                    |
|                                                                         |
| [Hosted MCP Handler]                                                    |
|  /api/mcp (WebStandardStreamableHTTPServerTransport, Unauthenticated)    |
|                                                                         |
| [Authenticated Web App Routes]                                          |
|  Protected by encrypted iron-session cookies                            |
|  /, /subscriptions, /reviews, /api/subscriptions, /api/reviews           |
|                                                                         |
| [Shared Services & Validation Layer]                                    |
|  - Zod parameter schemas                                                |
|  - Integer paise currency conversion (1 INR = 100 paise)                |
|  - Auto 7-day review trigger calculation (Asia/Kolkata timezone)        |
+------------------------------------+------------------------------------+
                                     |
                                     | Managed Database Queries
                                     v
+-------------------------------------------------------------------------+
| SUPABASE MANAGED POSTGRESQL                                             |
|                                                                         |
| - subscriptions: id, vendor, amount_paise, billing_cycle, renewal, owner |
| - reviews: id, subscription_id, decision, action_status, rationale       |
| - activity_log: id, actor ('claude'|'user'|'system'), action, payload    |
+-------------------------------------------------------------------------+
```

### Key Technical Guardrails:
- **No Embedded AI Inside RenewDesk:** Zero OpenAI, Anthropic, or model API keys exist inside the application runtime. Claude calls RenewDesk; RenewDesk never calls an LLM.
- **Currency Precision:** All financial figures are stored as integer paise (`amount_paise`), eliminating floating point rounding errors. Renders in Indian Rupees (`₹`) with tabular figures.
- **Timezone Guarantee:** All dates and 7-day renewal review triggers calculate in Indian Standard Time (`Asia/Kolkata`, `UTC+5:30`).
- **Authentication Separation:** Web application routes require encrypted HttpOnly `iron-session` cookies. The `/api/mcp` endpoint is public and unauthenticated for evaluator demonstration.

---

## 4. MCP Tools Reference

The hosted server at `/api/mcp` exposes 4 registered tools:

| Tool Name | Operation | Parameters | Description |
|---|---|---|---|
| `list_subscriptions` | Read | `filterDays` (number), `owner` (string), `search` (string) | Returns current subscriptions with calculated review states and renewal dates. |
| `save_subscriptions` | Write | `vendor` (string), `amount_paise` (int), `billing_cycle` ('monthly'\|'annual'), `next_renewal` (YYYY-MM-DD), `owner` (string), `context` (string) | Creates or updates a subscription. Automatically triggers a renewal review due 7 days prior. |
| `list_reviews` | Read | `windowDays` (number), `decision` ('undecided'\|'keep'\|'cancel'\|'need_info'), `actionStatus` ('open'\|'completed') | Queries renewal reviews filtered by timeframe or decision status. |
| `save_reviews` | Write | `review_id` (uuid), `decision` (string), `owner` (string), `due_date` (string), `rationale` (string), `checklist` (array) | Updates review verdict and context. Cannot mark vendor cancellation completed. |

---

## 5. Verified End-to-End User Journey

The following end-to-end journey has been verified through our automated audit suite and directly in Claude Desktop by Sukhmeet Singh Lamba:

1. **User Asks in Claude:**
   Prompt: *"Add a new subscription: Loom Pro, INR 2200/month, renews 2026-12-05, owned by Priya Sharma. Context: Screen recording tool for support team."*
2. **Claude Invokes MCP Tool:**
   Claude selects `save_subscriptions` and sends typed parameters over Streamable HTTP to `https://renewdesk-phi.vercel.app/api/mcp`.
3. **RenewDesk Validates & Stores:**
   RenewDesk validates parameters with Zod, writes 220,000 paise to Supabase Postgres, schedules an active review due 7 days before renewal (`2026-11-28` in Asia/Kolkata), and records an entry in `activity_log` with actor `claude`.
4. **User Opens RenewDesk:**
   User signs in at `https://renewdesk-phi.vercel.app`. Loom Pro appears in the 30-day renewal spend total, in Subscriptions, and in the "To Review" column on the Reviews board.
5. **Human Review & Decision:**
   Priya reviews Loom Pro, sets decision to `Cancel`, and adds rationale: *"Migrating team to Slack native video clips."*
6. **Cancellation Safeguard Modal:**
   A safety warning reminds the user that setting Cancel does not cancel the SaaS contract. An explicit human confirmation modal is required once cancellation is completed with Loom.
7. **Claude Reads Updated Rationale:**
   User asks Claude: *"What is the current status and rationale for Loom Pro?"* Claude calls `list_reviews` and cites Priya's rationale verbatim.

---

## 6. How to Connect Claude Without Claude Pro

You do not need a paid Claude Pro subscription to test or record demos for RenewDesk.

### Option A: Free Claude Desktop (macOS & Windows)
Claude Desktop natively supports remote MCP servers on the 100% free tier.

1. Download Claude Desktop from [claude.ai/download](https://claude.ai/download).
2. Open configuration:
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Add the RenewDesk remote server bridge:
   ```json
   {
     "mcpServers": {
       "renewdesk": {
         "command": "npx",
         "args": [
           "-y",
           "mcp-remote",
           "https://renewdesk-phi.vercel.app/api/mcp"
         ]
       }
     }
   }
   ```
4. Restart Claude Desktop. Look for the hammer or plug icon showing 4 active RenewDesk tools.
5. Try: *"What subscriptions are renewing in the next 30 days in RenewDesk?"*

### Option B: Official MCP Inspector (Zero Cost, No Account)
Anthropic maintains an open source inspector for testing MCP servers directly in your browser:
```bash
npx @modelcontextprotocol/inspector https://renewdesk-phi.vercel.app/api/mcp
```
Opens an interactive web GUI at `http://localhost:5173` to test tool discovery and live execution without tokens.

---

## 7. Responsibilities Matrix

RenewDesk is an independent assignment prototype created by Sukhmeet Singh Lamba. It has no implemented integration with Volopay systems or live payment rails.

| Actor / System | Operational Role | Responsibilities |
|---|---|---|
| **Customer / Human Owner** | Decision Maker | Provide business context, assign decision owner, record keep or cancel verdict, and complete cancellation with vendor billing portal. |
| **Claude / Anthropic** | External AI Client | Natural language interpretation, parameter extraction, and MCP tool selection. |
| **RenewDesk Application** | Software Core | Schema validation, PostgreSQL persistence, financial calculations, 3-column review stages, and cancellation safety modal. |
| **Supabase & Vercel** | Infrastructure | Next.js serverless compute hosting on Vercel; managed PostgreSQL 15 database on Supabase. |
| **Subscription Vendor** | SaaS Provider | Recurring credit card billing, invoicing, and account termination execution. |
| **Volopay (Current Prototype)** | Evaluator | No runtime role in this deployed build. |
| **Volopay (Proposed Partnership)** | Future Financial Rail | Proposed integration: stream corporate card transactions to detect new subscriptions, and auto-freeze virtual cards when human confirms cancellation in RenewDesk. |

---

## 8. Built Prototype vs. Proposed Production System

| Area | What Exists Now (Prototype) | What Production Would Require | Why It Matters |
|---|---|---|---|
| **Auth & Isolation** | Single demo user (`demo@renewdesk.app`) in a shared workspace. | Multi-tenant Supabase Auth, Row Level Security (RLS) policies by workspace ID. | Prevents data leakage across different companies. |
| **MCP Auth** | Public unauthenticated endpoint for evaluation convenience. | OAuth 2.0 authorization code flow or user-scoped API bearer keys in headers. | Protects corporate financial data from unauthorized external access. |
| **Ingestion** | Manual entry in web UI or conversational entry via Claude. | Forwarding parser for email receipts and proposed Volopay virtual card transaction feeds. | Eliminates manual entry; catches shadow IT subscriptions. |
| **Lifecycle** | Single review per subscription, 7-day trigger calculated on write. | Recurring annual rollover: completing a review queues next year's review. | Prevents subscriptions from dropping out of tracking after their first cycle. |
| **Alerts** | Visual status badges (Overdue, Due in 7d) inside web app only. | Scheduled Vercel Cron worker triggering Slack incoming webhooks and email digests. | Ensures owners act before cancellation notice deadlines lapse. |
| **Observability** | Append-only `activity_log` table in Postgres; not surfaced in UI. | Surfaced audit timeline in subscription drawer and centralized OpenTelemetry logging. | Builds auditability and transparent accountability for spend reviews. |

---

## 9. Local Development & Testing

```bash
# 1. Clone repository
git clone https://github.com/sukh285/RenewDesk.git
cd RenewDesk

# 2. Install dependencies
npm install

# 3. Environment configuration
cp .env.example .env.local
# Populate SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET

# 4. Database migrations & seed
node scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs

# 5. Type check & build
npm run type-check
npm run build

# 6. Run automated production audit against live app
node scripts/audit.mjs https://renewdesk-phi.vercel.app
```

---

## 10. Technical Notes & Deliverables

- **Architecture Notes PDF:** A high-resolution, vector-diagram PDF is available at [`docs/ARCHITECTURE_AND_IMPLEMENTATION_NOTES.pdf`](docs/ARCHITECTURE_AND_IMPLEMENTATION_NOTES.pdf) (3 pages, 0.26 MB).
- **Editable Source:** [`docs/ARCHITECTURE_AND_IMPLEMENTATION_NOTES.html`](docs/ARCHITECTURE_AND_IMPLEMENTATION_NOTES.html).
- **Punctuation Compliance:** Zero em dash or en dash characters in authored copy, comments, or documentation.

# RenewDesk

Subscription renewal decision tracking for small teams. Know what renews, who owns the decision, and what action was taken.

Built for the Volopay Founder's Office application.

## Documentation

- [Build Timeline](docs/BUILD_TIMELINE.md) - Chronological development log and milestone verification
- [Product Summary](docs/PRODUCT_SUMMARY.md) - Full product handoff, architecture, data model, MCP tool documentation, Claude connection instructions, and demo script

## Quick Start

```bash
# Install dependencies
npm install

# Run database setup & seed
# Run the SQL script at supabase/setup_and_seed.sql in your Supabase SQL Editor

# Start development server
npm run dev
```

## Stack

- Next.js 16 (App Router, Turbopack, TypeScript)
- Tailwind CSS & shadcn/ui
- Model Context Protocol (MCP) Streamable HTTP SDK
- Supabase PostgreSQL
- iron-session (secure HttpOnly cookies)

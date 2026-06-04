# @chatrealty/mcp-server

Model Context Protocol server for ChatRealty. Lets any Claude client (Claude Code, Claude Desktop, claude.ai) read and write to your ChatRealty platform using **your own Claude subscription** — no Anthropic API key needed.

**v0.1.0 — scaffold release.** Ships one tool (`whoami`) to validate the auth and transport. Full tool catalog (MLS search, market data, landing pages, articles, contacts, campaigns) lands in subsequent releases per `docs/mcp/rollout-plan.md`.

## Get your token

Mint a ChatRealty API token in your agent dashboard at
**Settings → Integrations → ChatRealty Desktop Skill → Generate token**.
The token is shown once. Copy it. (Same token works for both the older skill installer and this MCP server.)

## Install — Claude Code

```bash
claude mcp add chatrealty -- npx -y @chatrealty/mcp-server
```

Then set the token in the env so the server can read it. In your project or globally:

```bash
claude mcp add-env chatrealty CHATREALTY_API_TOKEN=crt_live_xxxxxxxxxxxx
```

Restart Claude Code. The `whoami` tool will appear in the tool tray.

## Install — Claude Desktop

Open Claude Desktop's connector settings (Settings → Connectors → Add Custom Connector → Local) and paste:

```json
{
  "chatrealty": {
    "command": "npx",
    "args": ["-y", "@chatrealty/mcp-server"],
    "env": {
      "CHATREALTY_API_TOKEN": "crt_live_xxxxxxxxxxxx"
    }
  }
}
```

Restart Claude Desktop. Confirm the connector loads and lists the `whoami` tool.

## Self-hosted / staging

```bash
CHATREALTY_API_BASE=https://staging.chatrealty.io
```

Defaults to `https://jpsrealtor.com`.

## Architecture

This package is a **thin stdio transport** over the existing ChatRealty REST API.
Every tool maps 1:1 to a `/api/skill/*` endpoint. Business logic, auth, scopes,
rate limiting, audit logging — all live in the backend, not here. Full design
in `docs/mcp/` at the ChatRealty repo.

## Available tools (v0.1.0)

| Tool | Description |
|---|---|
| `whoami` | Returns the authenticated agent's name, email, site URL, and token info. Always call this first in a session. |

## Roadmap

See `docs/mcp/rollout-plan.md` in the ChatRealty repo. Phase 1 adds:
- Agent meta: `my_agent_profile`, `my_stats`
- MLS: `search_listings`, `get_listing`, `get_listing_photos`, `find_comparables`, `search_closed_listings`
- Market: `get_market_stats`, `get_subdivision_cma`, `get_neighborhood_info`, `get_mortgage_rates`
- CMS landing pages: `list_my_landing_pages`, `get_landing_page` (expanded), `update_landing_page`, plus the already-shipped `create_landing_page`

## Privacy / data flow

When you call a tool, the response goes into Claude's context. That means:
- **MLS / market data**: Public-ish data; no concern.
- **Landing-page content you've already drafted**: Visible to Claude.
- **Future CRM read tools**: Will surface lead PII (name, phone, email). Gated behind a separate `contacts:read` scope you have to opt into when minting the token.

Full disclosure: `docs/mcp/scopes-and-safety.md`.

## Revoking access

Revoke the token in your ChatRealty dashboard (Settings → Integrations).
Any device using that token loses access immediately. Restart Claude after revoking.

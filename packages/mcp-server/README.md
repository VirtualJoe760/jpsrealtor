# @chatrealty/mcp-server

Model Context Protocol server for ChatRealty. Lets any Claude client (Claude Code, Claude Desktop, claude.ai) read and write to your ChatRealty platform using **your own Claude subscription** — no Anthropic API key needed.

**v0.5.0** — 23 tools across agent meta, MLS search, market data, CMS landing pages, CMS articles, and CRM contact reads. v0.5.0 adds `maxDaysOnMarket` / `minDaysOnMarket` filters on `search_listings` (e.g. "what hit the market this week?" / "what's been sitting unsold?"). v0.4.0 added `hasPool` + surfaced `pool` / `poolFeatures` / `currentPrice` / `latitude` / `longitude` / `listAgentName` / `listOfficeName` on listing responses, and derives `daysOnMarket` from `onMarketDate`. v0.3.0 fixed the propertyType resolver (rentals/land/multi-family now searchable, sales are the default) and the photo URL camelCase mismatch. Backed by per-token scopes and tiered rate limits on the ChatRealty side. Roadmap (analytics reads, hosted MCP endpoint, CRM writes, campaign drafts and sends) lives in `docs/mcp/rollout-plan.md` in the ChatRealty repo.

## Get your token

Mint a ChatRealty API token in your agent dashboard at
**Settings → Integrations → ChatRealty Desktop Skill → Generate token**.
The token is shown once. Copy it. Per-token scopes let you grant only the
domains you need (e.g. MLS read but not contact PII).

## Install — Claude Code

```bash
claude mcp add chatrealty -- npx -y @chatrealty/mcp-server
claude mcp add-env chatrealty CHATREALTY_API_TOKEN=crt_live_xxxxxxxxxxxx
```

Restart Claude Code. The ChatRealty tools appear in the tool tray.

## Install — Claude Desktop

Open Claude Desktop → Settings → Connectors → Add Custom Connector → Local, and paste:

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

Restart Claude Desktop. Confirm the connector loads and lists the tools.

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

## Available tools (v0.2.0)

### Agent meta
| Tool | Description |
|---|---|
| `whoami` | Returns the authenticated agent + token info. Call this first. |
| `my_agent_profile` | Full agent profile (bio, service areas, specialties, contact info). |
| `my_stats` | Listing counts, recent activity, lead totals — quick agent dashboard summary. |

### MLS / Listings
| Tool | Description |
|---|---|
| `search_listings` | Search active MLS listings by city, price range, bed/bath, property type. |
| `get_listing` | Full listing detail by `listingKey`. |
| `get_listing_photos` | Photo URLs + captions for a listing. |
| `find_comparables` | Comparable listings within a radius / price band. |
| `search_closed_listings` | Search closed (sold) MLS records for CMA work. |

### Market data
| Tool | Description |
|---|---|
| `get_market_stats` | Median price, DOM, inventory for a city / zip. |
| `get_subdivision_cma` | Pre-computed CMA stats for a named subdivision (1,400+ in the dataset). |
| `get_neighborhood_info` | Neighborhood snapshot — schools, amenities, market trend. |
| `get_mortgage_rates` | Current published mortgage rates (refreshed daily). |

### CMS — landing pages
| Tool | Description |
|---|---|
| `create_landing_page` | Draft a new landing page with sections, hero, CTAs. |
| `list_my_landing_pages` | List your drafts and published landing pages. |
| `get_landing_page` | Full LP content by slug. |
| `update_landing_page` | Edit an existing LP draft. |

### CMS — articles
| Tool | Description |
|---|---|
| `create_article` | Draft a market-insight / how-to / community article. |
| `list_my_articles` | List your articles by status, topic, date. |
| `get_article` | Full article content by slug. |
| `update_article` | Edit an existing article draft. |

### CRM — contacts (requires `contacts:read` scope)
| Tool | Description |
|---|---|
| `search_my_contacts` | Search your contacts by name / phone / email / label. |
| `get_contact` | Full contact profile + notes + interaction history. |
| `my_recent_leads` | Recent inbound leads with source. |

## Privacy / data flow

When you call a tool, the response goes into Claude's context. That means:

- **MLS / market data**: Public-ish data; no concern.
- **Landing-page / article drafts**: Visible to Claude.
- **CRM reads**: Surface lead PII (name, phone, email). Gated behind the
  separate `contacts:read` scope you opt into when minting a token. Don't
  grant it on tokens you don't fully trust the client of.

Full disclosure: `docs/mcp/scopes-and-safety.md` in the ChatRealty repo.

## Revoking access

Revoke the token in your ChatRealty dashboard (Settings → Integrations).
Any device using that token loses access immediately. Restart Claude after revoking.

## License

MIT — see [LICENSE](./LICENSE).

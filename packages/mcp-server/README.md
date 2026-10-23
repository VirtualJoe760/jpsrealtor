# @chatrealty/mcp-server

Model Context Protocol server for ChatRealty. Lets any Claude client (Claude Code, Claude Desktop, claude.ai) read and write your ChatRealty workspace using **your own Claude subscription** — no Anthropic API key needed.

**43 tools**: MLS listings and sold history, rental cash-flow analysis, market data, landing pages and articles, CRM contact reads, and the full **website-building flow** — a step-by-step build guide (`get_build_guide`) that drives [`create-chatrealty-site`](https://www.npmjs.com/package/create-chatrealty-site), connects the finished site to your own listings (`get_site_claim_code`), and puts it live on your ChatRealty subdomain (`connect_site`, `set_site_live`). Every tool is a thin wrapper over the ChatRealty REST API; scopes, rate limits and business rules are enforced there.

## Get your token

Mint a ChatRealty API token in your agent dashboard at
**Settings → Integrations** (the "ChatRealty Desktop Skill" card). The token is
shown once. Pick a preset:

- **Website** — listings, market data, your blog, and site management. Use this
  one to build and launch a website: it is the only preset that includes
  `site:manage`, which `connect_site` / `set_site_live` / `site_status` need.
- **Content drafting / Lead-aware / Full workspace** — landing pages, articles,
  and (lead-aware and up) contact PII. These do not include `site:manage`.
- **Custom** — pick individual scopes.

## Install — Claude Code

```bash
claude mcp add chatrealty -e CHATREALTY_API_TOKEN=crt_live_xxxxxxxxxxxx -- npx -y @chatrealty/mcp-server
```

Restart Claude Code. The ChatRealty tools appear in the tool list.

## Install — Claude Desktop

Add to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "chatrealty": {
      "command": "npx",
      "args": ["-y", "@chatrealty/mcp-server"],
      "env": {
        "CHATREALTY_API_TOKEN": "crt_live_xxxxxxxxxxxx"
      }
    }
  }
}
```

Restart Claude Desktop and confirm the server lists its tools.

## No install — hosted connector (web and mobile)

In the Claude app: **Settings → Connectors → Add custom connector**, URL
`https://www.chatrealty.io/api/mcp/mcp` (use `www`), then paste your token on the
ChatRealty sign-in screen. The hosted connector always runs the latest code and
also offers the carousel-image and Instagram-posting tools when your token has
their scopes.

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `CHATREALTY_API_TOKEN` | — (required) | Your `crt_live_` token |
| `CHATREALTY_API_BASE` | `https://jpsrealtor.com` | API host, e.g. `http://localhost:3000` for local development |
| `CHATREALTY_TIER` | `agent` | `research` exposes only the read-only client-research tools |

## Tools

Listed by the default `agent` tier of this package.

| Group | Tools |
|---|---|
| Identity & help | `whoami` (call first), `my_agent_profile`, `my_stats`, `get_build_guide`, `report_bug`, `report_data_issue`, `give_feedback` |
| Website | `get_site_claim_code`, `site_status`, `connect_site`, `set_site_live`, `get_tracking`, `set_tracking` |
| MLS listings | `search_listings`, `show_listing_board`, `get_listing`, `get_listing_photos`, `find_comparables`, `search_closed_listings` |
| Rental cash-flow | `get_area_cashflow`, `find_cashflowing_listings`, `analyze_listing_cashflow`, `get_going_rate` |
| Market data | `get_market_stats`, `get_subdivision_cma`, `get_neighborhood_info`, `get_mortgage_rates` |
| Landing pages | `create_landing_page`, `list_my_landing_pages`, `get_landing_page`, `update_landing_page` |
| Articles | `create_article`, `list_my_articles`, `get_article`, `update_article` (can publish a draft — only on your say-so) |
| CRM (needs `contacts:read`) | `search_my_contacts`, `get_contact`, `my_recent_leads` |
| Hosted connector only | `plan_listing_carousel`, `stage_listing_with_agent`, `create_listing_cover`, `create_carousel_slide`, `post_instagram_carousel` (publishes immediately; needs `social:post`) |

The build guide is also served as MCP resources under `guide://chatrealty/build-guide`.

## Building a website

Ask Claude to build you a website. It reads the build guide, checks whether your
listings are connected (`whoami`), scaffolds with
`npx create-chatrealty-site@latest my-site --test-data`, and — if your listings
are seeded in ChatRealty — connects the site to them with a one-time claim code,
so you never handle a key. Sample (test) data never goes live: deploying it is
blocked on purpose. Going live requires your license number on your ChatRealty
profile.

## Privacy / data flow

When you call a tool, the response goes into Claude's context. That means:

- **MLS / market data**: licensed listing data; no contact PII.
- **Landing-page / article drafts**: visible to Claude.
- **CRM reads**: surface lead PII (name, phone, email). Gated behind the
  separate `contacts:read` scope you opt into when minting a token.

## Revoking access

Revoke the token in your ChatRealty dashboard (Settings → Integrations).
Any device using that token loses access immediately.

## License

MIT — see [LICENSE](./LICENSE).

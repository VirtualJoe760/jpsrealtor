# @chatrealty/install-skill

Installs the ChatRealty Claude skill so you can create landing-page drafts on your ChatRealty site from any Claude window — Claude Code, Claude Desktop, claude.ai/code.

## Install

1. Get your ChatRealty API token from your agent dashboard:
   **Settings → Integrations → ChatRealty Desktop Skill → Generate token**.
   The token is shown once. Copy it.

2. Run the installer:

```bash
npx @chatrealty/install-skill <your-token>
```

   Or run without an argument and you'll be prompted:

```bash
npx @chatrealty/install-skill
```

The installer:
- Verifies the token by calling `/api/skill/me` on your ChatRealty site
- Writes the skill definition to `~/.claude/skills/chatrealty-landing-page/SKILL.md`
- Writes the token to `~/.claude/.chatrealty.env` (chmod 600)

3. Restart Claude Code or Claude Desktop.

## Use

Open any Claude window and say something like:

> Create a chatrealty landing page about luxury golf condos in PGA West for retiring buyers.

The skill will ask a few quick questions (audience, CTA, hero photo, form fields), draft the page, and create a draft on your ChatRealty site. You'll get an edit URL where you can review and publish.

## What it creates

**Drafts only.** Nothing goes live until you review and publish from your CMS at `/agent/cms`. This is intentional — the skill is a fast first draft, not a publish-from-prompt tool.

## Custom API host

For self-hosted / staging deployments:

```bash
CHATREALTY_API_BASE=https://staging.chatrealty.io npx @chatrealty/install-skill <token>
```

## Revoking access

Visit Settings → Integrations on your ChatRealty site and click Revoke on the token. The skill stops working immediately for any device using that token.

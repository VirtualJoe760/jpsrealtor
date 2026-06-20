#!/usr/bin/env bash
#
# push-google-env-to-vercel.sh
# Pushes only the GOOGLE_ADS_* / GOOGLE_CLIENT_* vars from .env.local to Vercel.
# Values are piped from the file and NEVER printed. Run it yourself from the repo
# root — your secrets stay on your machine.
#
#   ./scripts/push-google-env-to-vercel.sh [env-file] [target]
#   target = production (default) | preview | development
#
# Requires: the Vercel CLI, logged in + linked to this project:
#   npm i -g vercel && vercel link
#
set -euo pipefail

ENV_FILE="${1:-.env.local}"
TARGET="${2:-production}"

[ -f "$ENV_FILE" ] || { echo "No $ENV_FILE found"; exit 1; }
command -v vercel >/dev/null 2>&1 || { echo "Install + link the Vercel CLI first: npm i -g vercel && vercel link"; exit 1; }

# Allowlist: only push these prefixes (avoids clobbering prod with local-only vars).
PREFIX_RE='^(GOOGLE_ADS_|GOOGLE_CLIENT_)'

count=0
while IFS= read -r line || [ -n "$line" ]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue          # comments
  [[ "$line" == *"="* ]] || continue                    # must be KEY=VALUE
  key="$(printf '%s' "${line%%=*}" | xargs)"            # trim whitespace
  [[ "$key" =~ $PREFIX_RE ]] || continue                # allowlist only
  val="${line#*=}"
  val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"  # strip quotes
  vercel env rm "$key" "$TARGET" -y >/dev/null 2>&1 || true            # replace if exists
  if printf '%s' "$val" | vercel env add "$key" "$TARGET" >/dev/null 2>&1; then
    echo "pushed: $key"
    count=$((count+1))
  else
    echo "FAILED: $key"
  fi
done < "$ENV_FILE"

echo "Done — $count var(s) pushed to $TARGET. Redeploy to apply:  vercel --prod"

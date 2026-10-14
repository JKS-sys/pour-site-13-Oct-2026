#!/usr/bin/env bash
# Deploy the Pour pages Worker (routes ipconfig.co.network/pour*) and push this folder to GitHub.
#   bash deploy.sh                 deploy + push
#   SKIP_PUSH=1 bash deploy.sh     deploy only
# Credentials: CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) and GH_TOKEN, read as data from
# .env / .env.local here, one folder up, or ~/.ipconfig.env — never `source`d.
set -euo pipefail
cd "$(dirname "$0")"
load_env() {
  local file="$1" line key val
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
    key="${BASH_REMATCH[2]}"; val="${BASH_REMATCH[3]}"
    if [[ "$val" =~ ^\"(.*)\"$ ]] || [[ "$val" =~ ^\'(.*)\'$ ]]; then val="${BASH_REMATCH[1]}"; fi
    [ -z "${!key:-}" ] && export "$key=$val"
  done < "$file"
}
for f in ./.env ./.env.local ../.env.local ../.env "$HOME/.ipconfig.env"; do load_env "$f"; done
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || { echo "✗ CLOUDFLARE_API_TOKEN is not set (.env.local)"; exit 1; }
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

# Cloudflare answers a 5xx now and then: retry those (5 tries, 5 → 40 s), never a real refusal.
wr() {
  local n=0 delay=5 out status
  while :; do
    set +e; out=$(npx wrangler "$@" 2>&1); status=$?; set -e
    if [ $status -eq 0 ]; then printf '%s\n' "$out"; return 0; fi
    if printf '%s' "$out" | grep -qiE 'malformed response|5[0-9][0-9] (Gateway|Internal|Service|Bad)|ETIMEDOUT|ECONNRESET|fetch failed|timed out'; then
      n=$((n+1)); [ $n -ge 5 ] && { printf '%s\n' "$out"; return $status; }
      echo "  · Cloudflare hiccup — retrying in ${delay}s ($n/4)" >&2; sleep $delay; delay=$((delay*2)); [ $delay -gt 40 ] && delay=40
    else printf '%s\n' "$out"; return $status; fi
  done
}

echo "→ Installing…"; npm ci --silent 2>/dev/null || npm install --silent
echo "→ Testing…"; npm test --silent
echo "→ Deploying the Pour Worker…"; wr deploy | tail -4
P=$(curl -fsS -A 'Mozilla/5.0' https://ipconfig.co.network/pour/api/apps 2>/dev/null || true)
printf '%s' "$P" | grep -q '"apps"' && echo "  ✓ /pour/api/apps answers ($(printf '%s' "$P" | grep -o '"token"' | wc -l | tr -d ' ') apps)" || echo "  · /pour/api/apps did not answer yet"
echo ""
echo "→ Pushing to GitHub…"; bash scripts/push-github.sh || echo "  ! push failed — the Worker is deployed; run: bash scripts/push-github.sh"

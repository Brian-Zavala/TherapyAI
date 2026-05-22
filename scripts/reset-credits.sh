#!/usr/bin/env bash
# Reset a user's therapy credits back to 0 used.
#
# Usage:
#   ./scripts/reset-credits.sh <email> [reason]
#   ./scripts/reset-credits.sh <email> [reason] --local
#
# Examples:
#   ./scripts/reset-credits.sh brian.zavala2025@gmail.com
#   ./scripts/reset-credits.sh user@example.com "dropped session refund"
#   ./scripts/reset-credits.sh user@example.com "testing" --local

set -euo pipefail

EMAIL="${1:-}"
REASON="${2:-Manual admin reset}"
TARGET="${3:-prod}"

if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 <email> [reason] [--local]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

if [[ "$TARGET" == "--local" ]]; then
  ENV_FILE="$REPO_ROOT/.env.local"
  HOST="http://localhost:3001"
  LABEL="LOCAL"
else
  ENV_FILE="$REPO_ROOT/.env"
  HOST="https://therapyai.us"
  LABEL="PROD"
fi

SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"

if [[ -z "$SECRET" ]]; then
  echo "CRON_SECRET not found in $ENV_FILE"
  exit 1
fi

echo "→ Resetting credits for $EMAIL on $LABEL ($HOST)"
echo

curl -sS -L -X POST "$HOST/api/admin/reset-user-credits" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"reason\":\"$REASON\"}" | (command -v jq >/dev/null && jq . || cat)

echo
